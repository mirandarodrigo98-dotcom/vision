'use server';

import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { uploadToR2, getR2DownloadLink } from '@/lib/r2';
import { ensureSolicitationsTables } from '@/lib/solicitations-db';
import {
  getSolicitationNotificationTitle,
  getSolicitationStatusLabel,
} from '@/lib/solicitations';
import { sendSolicitationNotification } from '@/lib/emails/notifications';
import { createNotification } from './notifications';
import { getUserPermissions } from './permissions';
import { getDigisacConfig, sendDigisacMessage } from './integrations/digisac';

function generateProtocolNumber() {
  const dateStr = format(new Date(), 'yyyyMMdd');
  const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${dateStr}${randomPart}`;
}

function normalizeText(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function getAllowedAttachmentTypes() {
  return [
    'application/pdf',
    'application/zip',
    'application/x-rar-compressed',
    'application/vnd.rar',
    'image/png',
    'image/jpeg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
}

function isAttachmentAllowed(file: File) {
  const allowedTypes = getAllowedAttachmentTypes();
  const lowerName = file.name.toLowerCase();
  return (
    allowedTypes.includes(file.type) ||
    lowerName.endsWith('.rar') ||
    lowerName.endsWith('.doc') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.xls') ||
    lowerName.endsWith('.xlsx')
  );
}

async function uploadSolicitationAttachment(file: File) {
  if (!file || file.size === 0) {
    return { fileKey: null as string | null, downloadLink: '' };
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('O arquivo deve ter no maximo 10MB.');
  }

  if (!isAttachmentAllowed(file)) {
    throw new Error('Tipo de arquivo invalido. Envie PDF, ZIP, RAR, PNG, JPG, DOC, DOCX, XLS ou XLSX.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split('.').pop() || 'bin';
  const fileName = `solicitations/${randomUUID()}.${extension}`;
  const upload = await uploadToR2(buffer, fileName, file.type || 'application/octet-stream');

  if (!upload) {
    throw new Error('Erro ao fazer upload do anexo.');
  }

  return {
    fileKey: upload.fileKey,
    downloadLink: upload.downloadLink,
  };
}

async function getCompanyForUser(companyId: string, userId: string, role: string) {
  if (role === 'client_user') {
    return (await db.query(`
      SELECT cc.id, COALESCE(cc.razao_social, cc.nome) AS nome, cc.cnpj
      FROM client_companies cc
      JOIN user_companies uc ON uc.company_id = cc.id
      WHERE uc.user_id = $1 AND cc.id = $2
    `, [userId, companyId])).rows[0] as { id: string; nome: string; cnpj: string } | undefined;
  }

  if (role === 'operator') {
    const restricted = (await db.query(`
      SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2
    `, [userId, companyId])).rows[0];

    if (restricted) return undefined;
  }

  return (await db.query(`
    SELECT id, COALESCE(razao_social, nome) AS nome, cnpj
    FROM client_companies
    WHERE id = $1
  `, [companyId])).rows[0] as { id: string; nome: string; cnpj: string } | undefined;
}

async function getSolicitationTypeById(id: string, activeOnly = false) {
  let query = `
    SELECT
      st.*,
      d.name AS department_name
    FROM solicitation_types st
    JOIN departments d ON d.id = st.department_id
    WHERE st.id = $1
  `;
  const params: any[] = [id];

  if (activeOnly) {
    query += ` AND st.is_active = TRUE`;
  }

  return (await db.query(query, params)).rows[0] as any;
}

async function getOfficeRecipients(
  companyId: string,
  departmentId: string,
  excludeUserIds: string[] = []
) {
  const recipients = (await db.query(`
    SELECT DISTINCT u.id, u.email
    FROM users u
    LEFT JOIN department_permissions dp
      ON dp.department_id = u.department_id
      AND dp.permission_code IN ('solicitations.view', 'solicitations.approve', 'solicitations.cancel')
    WHERE COALESCE(u.is_active, 1) = 1
      AND (
        u.role = 'admin'
        OR (
          u.role = 'operator'
          AND u.department_id = $2
          AND dp.permission_code IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM user_restricted_companies urc
            WHERE urc.user_id = u.id
              AND urc.company_id = $1
          )
        )
      )
  `, [companyId, departmentId])).rows as Array<{ id: string; email: string | null }>;

  return recipients.filter((recipient) => !excludeUserIds.includes(recipient.id));
}

async function notifyOffice(
  companyId: string,
  departmentId: string,
  solicitationId: string,
  title: string,
  message: string,
  excludeUserIds: string[] = []
) {
  const recipients = await getOfficeRecipients(companyId, departmentId, excludeUserIds);

  await Promise.all(recipients.map((recipient) =>
    createNotification(recipient.id, title, message, `/admin/solicitations/${solicitationId}/view`, 'info')
  ));
}

async function notifyCreator(
  creatorUserId: string | null | undefined,
  solicitationId: string,
  title: string,
  message: string,
  excludeUserId?: string
) {
  if (!creatorUserId || creatorUserId === excludeUserId) return;
  await createNotification(creatorUserId, title, message, `/app/solicitations/${solicitationId}/view`, 'info');
}

async function notifyCreatorWhatsapp(
  creatorUserId: string | null | undefined,
  message: string,
  excludeUserId?: string
) {
  if (!creatorUserId || creatorUserId === excludeUserId) return;

  const creator = (await db.query(`
    SELECT name, cell_phone, notification_whatsapp
    FROM users
    WHERE id = $1
  `, [creatorUserId])).rows[0] as
    | { name: string | null; cell_phone: string | null; notification_whatsapp: boolean | number | null }
    | undefined;

  if (!creator?.cell_phone || !creator.notification_whatsapp) {
    return;
  }

  const digisacConfig = await getDigisacConfig();
  if (!digisacConfig?.is_active || !digisacConfig.connection_phone) {
    return;
  }

  try {
    await sendDigisacMessage({
      number: creator.cell_phone,
      serviceId: digisacConfig.connection_phone,
      body: message,
      contactName: creator.name || undefined,
      origin: 'bot',
      dontOpenTicket: true,
    });
  } catch (error) {
    console.error('Error sending solicitation whatsapp notification:', error);
  }
}

async function loadSolicitationWithRelations(id: string) {
  return (await db.query(`
    SELECT
      s.*,
      COALESCE(cc.razao_social, cc.nome) AS company_name,
      cc.cnpj AS company_cnpj,
      st.name AS request_type_name,
      st.description AS request_type_description,
      d.name AS department_name,
      u.name AS created_by_name,
      u.email AS created_by_email
    FROM solicitations s
    JOIN client_companies cc ON cc.id = s.company_id
    JOIN solicitation_types st ON st.id = s.request_type_id
    JOIN departments d ON d.id = s.department_id
    LEFT JOIN users u ON u.id = s.created_by_user_id
    WHERE s.id = $1
  `, [id])).rows[0] as any;
}

async function validateSolicitationAccess(
  solicitation: any,
  userId: string,
  role: string,
  departmentId?: string | null
) {
  if (role === 'client_user') {
    const hasAccess = (await db.query(`
      SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2
    `, [userId, solicitation.company_id])).rows[0];

    return Boolean(hasAccess) || solicitation.created_by_user_id === userId;
  }

  if (role === 'operator') {
    const restricted = (await db.query(`
      SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2
    `, [userId, solicitation.company_id])).rows[0];

    if (restricted) return false;

    return solicitation.department_id === departmentId;
  }

  return true;
}

function getSolicitationSummary(requestTypeName: string, subject: string) {
  return `${requestTypeName} - ${subject}`;
}

export async function createSolicitation(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const permissions = await getUserPermissions();
  const canCreate = session.role === 'admin' || permissions.includes('solicitations.create');
  if (!canCreate) return { error: 'Sem permissao para criar solicitacao.' };

  try {
    await ensureSolicitationsTables();

    const companyId = String(formData.get('company_id') || '');
    const requestTypeId = String(formData.get('request_type_id') || '');
    const subject = normalizeText(formData.get('subject'));
    const details = normalizeText(formData.get('details'));
    const attachmentFile = formData.get('attachment') as File;

    if (!companyId || !requestTypeId || !subject || !details) {
      return { error: 'Preencha os campos obrigatorios da solicitacao.' };
    }

    const company = await getCompanyForUser(companyId, session.user_id, session.role);
    if (!company) return { error: 'Sem permissao para esta empresa.' };

    const requestType = await getSolicitationTypeById(requestTypeId, true);
    if (!requestType) {
      return { error: 'Tipo de solicitacao nao encontrado ou inativo.' };
    }

    const { fileKey, downloadLink } = await uploadSolicitationAttachment(attachmentFile);
    const id = randomUUID();
    const protocolNumber = generateProtocolNumber();

    await db.query(`
      INSERT INTO solicitations (
        id,
        company_id,
        request_type_id,
        department_id,
        subject,
        details,
        attachment_key,
        status,
        protocol_number,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'SUBMITTED', $8, $9,
        (NOW() - INTERVAL '3 hours'),
        (NOW() - INTERVAL '3 hours')
      )
    `, [
      id,
      companyId,
      requestTypeId,
      requestType.department_id,
      subject,
      details,
      fileKey,
      protocolNumber,
      session.user_id,
    ]);

    await logAudit({
      actor_user_id: session.user_id,
      actor_email: session.email,
      action: 'CREATE_SOLICITATION',
      entity_type: 'SOLICITATION',
      entity_id: id,
      metadata: { protocolNumber, companyId, requestTypeId, departmentId: requestType.department_id },
      success: true,
    });

    const title = getSolicitationNotificationTitle(
      requestType.name,
      getSolicitationStatusLabel('SUBMITTED')
    );
    const message = `${session.name || session.email} solicitou ${requestType.name.toLowerCase()} para ${company.nome}.`;

    await notifyOffice(companyId, requestType.department_id, id, title, message, [session.user_id]);

    await sendSolicitationNotification('NEW', {
      companyName: company.nome,
      cnpj: company.cnpj,
      userName: session.name || session.email,
      requestTypeName: requestType.name,
      departmentName: requestType.department_name,
      requestSummary: getSolicitationSummary(requestType.name, subject),
      subject,
      details,
      senderEmail: session.email,
      downloadLink: downloadLink || undefined,
    });

    revalidatePath('/app/solicitations');
    revalidatePath('/admin/solicitations');
    return { success: true, id, protocol_number: protocolNumber };
  } catch (error: any) {
    console.error('Create Solicitation Error:', error);
    return { error: error.message || 'Erro ao criar solicitacao.' };
  }
}

export async function updateSolicitation(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const permissions = await getUserPermissions();
  const canEdit = session.role === 'admin' || permissions.includes('solicitations.create');
  if (!canEdit) return { error: 'Sem permissao para retificar esta solicitacao.' };

  try {
    await ensureSolicitationsTables();

    const existing = await loadSolicitationWithRelations(id);
    if (!existing) return { error: 'Solicitacao nao encontrada.' };

    const hasAccess = await validateSolicitationAccess(
      existing,
      session.user_id,
      session.role,
      session.department_id
    );
    if (!hasAccess) return { error: 'Sem permissao para esta solicitacao.' };

    if (existing.status === 'CANCELLED' || existing.status === 'COMPLETED') {
      return { error: 'Esta solicitacao nao pode mais ser retificada.' };
    }

    const subject = normalizeText(formData.get('subject'));
    const details = normalizeText(formData.get('details'));
    const attachmentFile = formData.get('attachment') as File;

    if (!subject || !details) {
      return { error: 'Preencha os campos obrigatorios da solicitacao.' };
    }

    let attachmentKey = existing.attachment_key as string | null;
    let downloadLink = '';
    const changes: string[] = [];

    if (normalizeText(existing.subject) !== subject) changes.push('subject');
    if (normalizeText(existing.details) !== details) changes.push('details');

    if (attachmentFile && attachmentFile.size > 0) {
      const uploaded = await uploadSolicitationAttachment(attachmentFile);
      attachmentKey = uploaded.fileKey;
      downloadLink = uploaded.downloadLink;
      changes.push('attachment');
    } else if (attachmentKey) {
      downloadLink = await getR2DownloadLink(attachmentKey);
    }

    await db.query(`
      UPDATE solicitations
      SET
        subject = $1,
        details = $2,
        attachment_key = $3,
        status = 'RECTIFIED',
        updated_at = (NOW() - INTERVAL '3 hours')
      WHERE id = $4
    `, [
      subject,
      details,
      attachmentKey,
      id,
    ]);

    await logAudit({
      actor_user_id: session.user_id,
      actor_email: session.email,
      action: 'UPDATE_SOLICITATION',
      entity_type: 'SOLICITATION',
      entity_id: id,
      metadata: { requestTypeId: existing.request_type_id, changes },
      success: true,
    });

    const title = getSolicitationNotificationTitle(
      existing.request_type_name,
      getSolicitationStatusLabel('RECTIFIED')
    );
    const message = `${session.name || session.email} retificou ${existing.request_type_name.toLowerCase()} para ${existing.company_name}.`;

    await notifyOffice(existing.company_id, existing.department_id, id, title, message, [session.user_id]);
    await notifyCreator(existing.created_by_user_id, id, title, message, session.user_id);

    await sendSolicitationNotification('UPDATE', {
      companyName: existing.company_name,
      cnpj: existing.company_cnpj,
      userName: session.name || session.email,
      requestTypeName: existing.request_type_name,
      departmentName: existing.department_name,
      requestSummary: getSolicitationSummary(existing.request_type_name, subject),
      subject,
      details,
      senderEmail: session.email,
      downloadLink: downloadLink || undefined,
      changes,
    });

    revalidatePath('/app/solicitations');
    revalidatePath('/admin/solicitations');
    revalidatePath(`/app/solicitations/${id}/view`);
    revalidatePath(`/app/solicitations/${id}/edit`);
    return { success: true };
  } catch (error: any) {
    console.error('Update Solicitation Error:', error);
    return { error: error.message || 'Erro ao retificar solicitacao.' };
  }
}

export async function cancelSolicitation(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const permissions = await getUserPermissions();
  const canCancel =
    session.role === 'admin' ||
    permissions.includes('solicitations.cancel') ||
    permissions.includes('solicitations.create');
  if (!canCancel) return { error: 'Sem permissao para cancelar esta solicitacao.' };

  try {
    await ensureSolicitationsTables();

    const solicitation = await loadSolicitationWithRelations(id);
    if (!solicitation) return { error: 'Solicitacao nao encontrada.' };

    const hasAccess = await validateSolicitationAccess(
      solicitation,
      session.user_id,
      session.role,
      session.department_id
    );
    if (!hasAccess) return { error: 'Sem permissao para esta solicitacao.' };

    if (solicitation.status === 'CANCELLED') return { error: 'Solicitacao ja cancelada.' };
    if (solicitation.status === 'COMPLETED') return { error: 'Solicitacao ja concluida.' };

    await db.query(`
      UPDATE solicitations
      SET status = 'CANCELLED', updated_at = (NOW() - INTERVAL '3 hours')
      WHERE id = $1
    `, [id]);

    await logAudit({
      actor_user_id: session.user_id,
      actor_email: session.email,
      action: session.role === 'admin' || session.role === 'operator'
        ? 'CANCEL_SOLICITATION_BY_ADMIN'
        : 'CANCEL_SOLICITATION',
      entity_type: 'SOLICITATION',
      entity_id: id,
      metadata: { requestTypeId: solicitation.request_type_id },
      success: true,
    });

    const title = getSolicitationNotificationTitle(
      solicitation.request_type_name,
      getSolicitationStatusLabel('CANCELLED')
    );
    const message = `${session.name || session.email} cancelou ${solicitation.request_type_name.toLowerCase()} para ${solicitation.company_name}.`;

    if (session.role === 'admin' || session.role === 'operator') {
      await notifyCreator(solicitation.created_by_user_id, id, title, message, session.user_id);
    } else {
      await notifyOffice(solicitation.company_id, solicitation.department_id, id, title, message, [session.user_id]);
      await notifyCreator(solicitation.created_by_user_id, id, title, message, session.user_id);
    }

    await sendSolicitationNotification(
      session.role === 'admin' || session.role === 'operator' ? 'CANCEL_BY_ADMIN' : 'CANCEL',
      {
        companyName: solicitation.company_name,
        cnpj: solicitation.company_cnpj,
        userName: session.name || session.email,
        requestTypeName: solicitation.request_type_name,
        departmentName: solicitation.department_name,
        requestSummary: getSolicitationSummary(solicitation.request_type_name, solicitation.subject),
        subject: solicitation.subject,
        details: solicitation.details,
        senderEmail: session.email,
        recipientEmail: (session.role === 'admin' || session.role === 'operator')
          ? solicitation.created_by_email
          : undefined,
      }
    );

    if (session.role === 'admin' || session.role === 'operator') {
      await notifyCreatorWhatsapp(
        solicitation.created_by_user_id,
        `VISION: sua solicitacao "${solicitation.request_type_name}" para ${solicitation.company_name} foi cancelada. Acesse o portal do cliente para acompanhar os detalhes.`,
        session.user_id
      );
    }

    revalidatePath('/app/solicitations');
    revalidatePath('/admin/solicitations');
    return { success: true };
  } catch (error: any) {
    console.error('Cancel Solicitation Error:', error);
    return { error: error.message || 'Erro ao cancelar solicitacao.' };
  }
}

export async function approveSolicitation(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const permissions = await getUserPermissions();
  const canApprove = session.role === 'admin' || permissions.includes('solicitations.approve');
  if (!canApprove) return { error: 'Sem permissao para concluir esta solicitacao.' };

  try {
    await ensureSolicitationsTables();

    const solicitation = await loadSolicitationWithRelations(id);
    if (!solicitation) return { error: 'Solicitacao nao encontrada.' };

    const hasAccess = await validateSolicitationAccess(
      solicitation,
      session.user_id,
      session.role,
      session.department_id
    );
    if (!hasAccess) return { error: 'Sem permissao para esta solicitacao.' };

    if (solicitation.status !== 'SUBMITTED' && solicitation.status !== 'RECTIFIED') {
      return { error: 'Apenas solicitacoes pendentes ou retificadas podem ser concluidas.' };
    }

    await db.query(`
      UPDATE solicitations
      SET
        status = 'COMPLETED',
        completed_by_user_id = $1,
        completed_at = (NOW() - INTERVAL '3 hours'),
        updated_at = (NOW() - INTERVAL '3 hours')
      WHERE id = $2
    `, [session.user_id, id]);

    await logAudit({
      actor_user_id: session.user_id,
      actor_email: session.email,
      action: 'APPROVE_SOLICITATION',
      entity_type: 'SOLICITATION',
      entity_id: id,
      metadata: { requestTypeId: solicitation.request_type_id },
      success: true,
    });

    const title = getSolicitationNotificationTitle(
      solicitation.request_type_name,
      getSolicitationStatusLabel('COMPLETED')
    );
    const message = `${session.name || session.email} concluiu ${solicitation.request_type_name.toLowerCase()} para ${solicitation.company_name}.`;

    await notifyCreator(solicitation.created_by_user_id, id, title, message, session.user_id);

    await sendSolicitationNotification('COMPLETED', {
      companyName: solicitation.company_name,
      cnpj: solicitation.company_cnpj,
      userName: session.name || session.email,
      requestTypeName: solicitation.request_type_name,
      departmentName: solicitation.department_name,
      requestSummary: getSolicitationSummary(solicitation.request_type_name, solicitation.subject),
      subject: solicitation.subject,
      details: solicitation.details,
      senderEmail: session.email,
      recipientEmail: solicitation.created_by_email || undefined,
    });

    await notifyCreatorWhatsapp(
      solicitation.created_by_user_id,
      `VISION: sua solicitacao "${solicitation.request_type_name}" para ${solicitation.company_name} foi concluida. Acesse o portal do cliente para acompanhar os detalhes.`,
      session.user_id
    );

    revalidatePath('/app/solicitations');
    revalidatePath('/admin/solicitations');
    return { success: true };
  } catch (error: any) {
    console.error('Approve Solicitation Error:', error);
    return { error: error.message || 'Erro ao concluir solicitacao.' };
  }
}

export async function getSolicitation(id: string) {
  const session = await getSession();
  if (!session) return null;

  try {
    await ensureSolicitationsTables();

    const solicitation = await loadSolicitationWithRelations(id);
    if (!solicitation) return null;

    const hasAccess = await validateSolicitationAccess(
      solicitation,
      session.user_id,
      session.role,
      session.department_id
    );
    if (!hasAccess) return null;

    if (solicitation.attachment_key) {
      try {
        solicitation.downloadLink = await getR2DownloadLink(solicitation.attachment_key);
      } catch (error) {
        console.error('Error generating solicitation download link:', error);
        solicitation.downloadLink = null;
      }
    }

    return solicitation;
  } catch (error) {
    console.error('Error fetching solicitation:', error);
    return null;
  }
}
