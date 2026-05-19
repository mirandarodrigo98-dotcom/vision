'use server';

import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { uploadToR2, getR2DownloadLink } from '@/lib/r2';
import { createNotification } from './notifications';
import { getUserPermissions } from './permissions';
import {
  EmployeeHistoryRequestType,
  getEmployeeHistoryNotificationTitle,
  getEmployeeHistoryStatusLabel,
  getEmployeeHistoryTypeConfig,
} from '@/lib/employee-histories';
import { ensureEmployeeHistoriesTable } from '@/lib/employee-histories-db';
import { sendEmployeeHistoryNotification } from '@/lib/emails/notifications';

function generateProtocolNumber() {
  const dateStr = format(new Date(), 'yyyyMMdd');
  const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${dateStr}${randomPart}`;
}

function getAllowedAttachmentTypes() {
  return [
    'application/pdf',
    'application/zip',
    'application/x-rar-compressed',
    'application/vnd.rar',
    'image/png',
    'image/jpeg',
  ];
}

function isAttachmentAllowed(file: File) {
  const allowedTypes = getAllowedAttachmentTypes();
  const isRar = file.name.toLowerCase().endsWith('.rar');
  return allowedTypes.includes(file.type) || isRar;
}

function normalizeText(value: unknown) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function sameDate(dbValue: unknown, formValue: string) {
  if (!dbValue && !formValue) return true;
  if (!dbValue || !formValue) return false;

  const dbString = String(dbValue).trim();
  const formString = String(formValue).trim();

  if (dbString === formString) return true;
  if (dbString.split('T')[0] === formString) return true;
  if (dbString.split(' ')[0] === formString) return true;

  if (dbValue instanceof Date) {
    return format(dbValue, 'yyyy-MM-dd') === formString;
  }

  return false;
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

async function getEmployeeForCompany(employeeId: string, companyId: string) {
  return (await db.query(`
    SELECT id, name
    FROM employees
    WHERE id = $1 AND company_id = $2
  `, [employeeId, companyId])).rows[0] as { id: string; name: string } | undefined;
}

async function uploadHistoryAttachment(file: File) {
  if (!file || file.size === 0) {
    return { fileKey: null as string | null, downloadLink: '' };
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error('O arquivo deve ter no máximo 10MB.');
  }

  if (!isAttachmentAllowed(file)) {
    throw new Error('Tipo de arquivo inválido. Apenas PDF, ZIP, RAR, PNG e JPG são permitidos.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split('.').pop() || 'bin';
  const fileName = `histories/${randomUUID()}.${extension}`;
  const upload = await uploadToR2(buffer, fileName, file.type || 'application/octet-stream');

  if (!upload) {
    throw new Error('Erro ao fazer upload do anexo.');
  }

  return {
    fileKey: upload.fileKey,
    downloadLink: upload.downloadLink,
  };
}

async function getOfficeRecipients(companyId: string, excludeUserIds: string[] = []) {
  const recipients = (await db.query(`
    SELECT DISTINCT u.id, u.email
    FROM users u
    LEFT JOIN department_permissions dp
      ON dp.department_id = u.department_id
      AND dp.permission_code IN ('histories.view', 'histories.approve', 'histories.cancel')
    WHERE u.is_active = 1
      AND (
        u.role = 'admin'
        OR (
          u.role = 'operator'
          AND dp.permission_code IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM user_restricted_companies urc
            WHERE urc.user_id = u.id
              AND urc.company_id = $1
          )
        )
      )
  `, [companyId])).rows as Array<{ id: string; email: string | null }>;

  return recipients.filter((recipient) => !excludeUserIds.includes(recipient.id));
}

async function notifyOffice(
  companyId: string,
  historyId: string,
  title: string,
  message: string,
  excludeUserIds: string[] = []
) {
  const recipients = await getOfficeRecipients(companyId, excludeUserIds);

  await Promise.all(recipients.map((recipient) =>
    createNotification(recipient.id, title, message, `/admin/histories/${historyId}/view`, 'info')
  ));
}

async function notifyCreator(
  creatorUserId: string | null | undefined,
  historyId: string,
  title: string,
  message: string,
  excludeUserId?: string
) {
  if (!creatorUserId || creatorUserId === excludeUserId) return;
  await createNotification(creatorUserId, title, message, `/app/histories/${historyId}/view`, 'info');
}

async function loadHistoryWithRelations(id: string) {
  return (await db.query(`
    SELECT
      h.*,
      COALESCE(cc.razao_social, cc.nome) AS company_name,
      cc.cnpj AS company_cnpj,
      e.name AS employee_name,
      u.name AS created_by_name,
      u.email AS created_by_email
    FROM employee_histories h
    JOIN client_companies cc ON cc.id = h.company_id
    JOIN employees e ON e.id = h.employee_id
    LEFT JOIN users u ON u.id = h.created_by_user_id
    WHERE h.id = $1
  `, [id])).rows[0] as any;
}

async function validateHistoryAccess(history: any, userId: string, role: string) {
  if (role === 'client_user') {
    const hasAccess = (await db.query(`
      SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2
    `, [userId, history.company_id])).rows[0];

    return Boolean(hasAccess) || history.created_by_user_id === userId;
  }

  if (role === 'operator') {
    const restricted = (await db.query(`
      SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2
    `, [userId, history.company_id])).rows[0];

    return !restricted;
  }

  return true;
}

function getHistorySummary(type: EmployeeHistoryRequestType, employeeName: string) {
  const config = getEmployeeHistoryTypeConfig(type);
  return `${config.shortLabel} - ${employeeName}`;
}

export async function createEmployeeHistory(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const permissions = await getUserPermissions();
  const canCreate = session.role === 'admin' || permissions.includes('histories.create');
  if (!canCreate) return { error: 'Sem permissão para criar solicitação de histórico.' };

  try {
    await ensureEmployeeHistoriesTable();

    const companyId = String(formData.get('company_id') || '');
    const employeeId = String(formData.get('employee_id') || '');
    const requestType = String(formData.get('request_type') || '') as EmployeeHistoryRequestType;
    const effectiveDate = normalizeText(formData.get('effective_date'));
    const currentData = normalizeText(formData.get('current_data'));
    const requestedChange = normalizeText(formData.get('requested_change'));
    const details = normalizeText(formData.get('details'));
    const attachmentFile = formData.get('attachment') as File;

    if (!companyId || !employeeId || !requestType || !requestedChange) {
      return { error: 'Preencha os campos obrigatórios da solicitação.' };
    }

    const config = getEmployeeHistoryTypeConfig(requestType);
    if (config.attachmentRequired && (!attachmentFile || attachmentFile.size === 0)) {
      return { error: 'Esta solicitação exige o envio de um anexo.' };
    }

    const company = await getCompanyForUser(companyId, session.user_id, session.role);
    if (!company) return { error: 'Sem permissão para esta empresa.' };

    const employee = await getEmployeeForCompany(employeeId, companyId);
    if (!employee) return { error: 'Funcionário não encontrado.' };

    const { fileKey, downloadLink } = await uploadHistoryAttachment(attachmentFile);
    const id = randomUUID();
    const protocolNumber = generateProtocolNumber();

    await db.query(`
      INSERT INTO employee_histories (
        id,
        company_id,
        employee_id,
        request_type,
        status,
        protocol_number,
        effective_date,
        current_data,
        requested_change,
        details,
        attachment_key,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, 'SUBMITTED', $5, $6, $7, $8, $9, $10, $11,
        (NOW() - INTERVAL '3 hours'),
        (NOW() - INTERVAL '3 hours')
      )
    `, [
      id,
      companyId,
      employeeId,
      requestType,
      protocolNumber,
      effectiveDate || null,
      currentData || null,
      requestedChange,
      details || null,
      fileKey,
      session.user_id,
    ]);

    logAudit({
      actor_user_id: session.user_id,
      actor_email: session.email,
      action: 'CREATE_EMPLOYEE_HISTORY',
      entity_type: 'EMPLOYEE_HISTORY',
      entity_id: id,
      metadata: { protocolNumber, requestType, companyId, employeeId },
      success: true,
    });

    const title = getEmployeeHistoryNotificationTitle(requestType, getEmployeeHistoryStatusLabel('SUBMITTED'));
    const message = `${session.name || session.email} solicitou ${config.emailNewLabel} para ${employee.name}.`;

    await notifyOffice(companyId, id, title, message, [session.user_id]);

    await sendEmployeeHistoryNotification('NEW', {
      companyName: company.nome,
      cnpj: company.cnpj,
      userName: session.name || session.email,
      employeeName: employee.name,
      requestLabel: config.label,
      requestSummary: getHistorySummary(requestType, employee.name),
      currentData,
      requestedChange,
      details,
      effectiveDate: effectiveDate || undefined,
      senderEmail: session.email,
      downloadLink: downloadLink || undefined,
    });

    revalidatePath('/app/histories');
    revalidatePath('/admin/histories');
    return { success: true, id, protocol_number: protocolNumber };
  } catch (error: any) {
    console.error('Create Employee History Error:', error);
    return { error: error.message || 'Erro ao criar solicitação de histórico.' };
  }
}

export async function updateEmployeeHistory(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const permissions = await getUserPermissions();
  const canEdit = session.role === 'admin' || permissions.includes('histories.create');
  if (!canEdit) return { error: 'Sem permissão para retificar esta solicitação.' };

  try {
    await ensureEmployeeHistoriesTable();

    const existing = await loadHistoryWithRelations(id);
    if (!existing) return { error: 'Solicitação não encontrada.' };

    const hasAccess = await validateHistoryAccess(existing, session.user_id, session.role);
    if (!hasAccess) return { error: 'Sem permissão para esta solicitação.' };

    if (existing.status === 'CANCELLED' || existing.status === 'COMPLETED') {
      return { error: 'Esta solicitação não pode mais ser retificada.' };
    }

    const requestType = String(formData.get('request_type') || existing.request_type) as EmployeeHistoryRequestType;
    const effectiveDate = normalizeText(formData.get('effective_date'));
    const currentData = normalizeText(formData.get('current_data'));
    const requestedChange = normalizeText(formData.get('requested_change'));
    const details = normalizeText(formData.get('details'));
    const attachmentFile = formData.get('attachment') as File;

    if (!requestedChange) {
      return { error: 'Informe a alteração solicitada.' };
    }

    const config = getEmployeeHistoryTypeConfig(requestType);
    let attachmentKey = existing.attachment_key as string | null;
    let downloadLink = '';
    const changes: string[] = [];

    if (normalizeText(existing.request_type) !== requestType) changes.push('request_type');
    if (!sameDate(existing.effective_date, effectiveDate)) changes.push('effective_date');
    if (normalizeText(existing.current_data) !== currentData) changes.push('current_data');
    if (normalizeText(existing.requested_change) !== requestedChange) changes.push('requested_change');
    if (normalizeText(existing.details) !== details) changes.push('details');

    if (attachmentFile && attachmentFile.size > 0) {
      const uploaded = await uploadHistoryAttachment(attachmentFile);
      attachmentKey = uploaded.fileKey;
      downloadLink = uploaded.downloadLink;
      changes.push('attachment');
    } else if (attachmentKey) {
      downloadLink = await getR2DownloadLink(attachmentKey);
    }

    if (config.attachmentRequired && !attachmentKey) {
      return { error: 'Esta solicitação exige o envio de um anexo.' };
    }

    await db.query(`
      UPDATE employee_histories
      SET
        request_type = $1,
        effective_date = $2,
        current_data = $3,
        requested_change = $4,
        details = $5,
        attachment_key = $6,
        status = 'RECTIFIED',
        updated_at = (NOW() - INTERVAL '3 hours')
      WHERE id = $7
    `, [
      requestType,
      effectiveDate || null,
      currentData || null,
      requestedChange,
      details || null,
      attachmentKey,
      id,
    ]);

    logAudit({
      actor_user_id: session.user_id,
      actor_email: session.email,
      action: 'UPDATE_EMPLOYEE_HISTORY',
      entity_type: 'EMPLOYEE_HISTORY',
      entity_id: id,
      metadata: { requestType, changes },
      success: true,
    });

    const title = getEmployeeHistoryNotificationTitle(requestType, getEmployeeHistoryStatusLabel('RECTIFIED'));
    const message = `${session.name || session.email} retificou ${config.emailNewLabel} de ${existing.employee_name}.`;

    await notifyOffice(existing.company_id, id, title, message, [session.user_id]);
    await notifyCreator(existing.created_by_user_id, id, title, message, session.user_id);

    await sendEmployeeHistoryNotification('UPDATE', {
      companyName: existing.company_name,
      cnpj: existing.company_cnpj,
      userName: session.name || session.email,
      employeeName: existing.employee_name,
      requestLabel: config.label,
      requestSummary: getHistorySummary(requestType, existing.employee_name),
      currentData,
      requestedChange,
      details,
      effectiveDate: effectiveDate || undefined,
      senderEmail: session.email,
      downloadLink: downloadLink || undefined,
      changes,
    });

    revalidatePath('/app/histories');
    revalidatePath('/admin/histories');
    revalidatePath(`/app/histories/${id}/view`);
    revalidatePath(`/app/histories/${id}/edit`);
    return { success: true };
  } catch (error: any) {
    console.error('Update Employee History Error:', error);
    return { error: error.message || 'Erro ao retificar solicitação.' };
  }
}

export async function cancelEmployeeHistory(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const permissions = await getUserPermissions();
  const canCancel = session.role === 'admin' || permissions.includes('histories.cancel') || permissions.includes('histories.create');
  if (!canCancel) return { error: 'Sem permissão para cancelar esta solicitação.' };

  try {
    await ensureEmployeeHistoriesTable();

    const history = await loadHistoryWithRelations(id);
    if (!history) return { error: 'Solicitação não encontrada.' };

    const hasAccess = await validateHistoryAccess(history, session.user_id, session.role);
    if (!hasAccess) return { error: 'Sem permissão para esta solicitação.' };

    if (history.status === 'CANCELLED') return { error: 'Solicitação já cancelada.' };
    if (history.status === 'COMPLETED') return { error: 'Solicitação já concluída.' };

    await db.query(`
      UPDATE employee_histories
      SET status = 'CANCELLED', updated_at = (NOW() - INTERVAL '3 hours')
      WHERE id = $1
    `, [id]);

    const action = session.role === 'admin' || session.role === 'operator'
      ? 'CANCEL_EMPLOYEE_HISTORY_BY_ADMIN'
      : 'CANCEL_EMPLOYEE_HISTORY';

    logAudit({
      actor_user_id: session.user_id,
      actor_email: session.email,
      action,
      entity_type: 'EMPLOYEE_HISTORY',
      entity_id: id,
      metadata: { requestType: history.request_type },
      success: true,
    });

    const config = getEmployeeHistoryTypeConfig(history.request_type);
    const title = getEmployeeHistoryNotificationTitle(history.request_type, getEmployeeHistoryStatusLabel('CANCELLED'));
    const message = `${session.name || session.email} cancelou ${config.emailNewLabel} de ${history.employee_name}.`;

    if (session.role === 'admin' || session.role === 'operator') {
      await notifyCreator(history.created_by_user_id, id, title, message, session.user_id);
    } else {
      await notifyOffice(history.company_id, id, title, message, [session.user_id]);
      await notifyCreator(history.created_by_user_id, id, title, message, session.user_id);
    }

    await sendEmployeeHistoryNotification(
      session.role === 'admin' || session.role === 'operator' ? 'CANCEL_BY_ADMIN' : 'CANCEL',
      {
        companyName: history.company_name,
        cnpj: history.company_cnpj,
        userName: session.name || session.email,
        employeeName: history.employee_name,
        requestLabel: config.label,
        requestSummary: getHistorySummary(history.request_type, history.employee_name),
        currentData: history.current_data || '',
        requestedChange: history.requested_change || '',
        details: history.details || '',
        effectiveDate: history.effective_date ? format(new Date(history.effective_date), 'dd/MM/yyyy') : undefined,
        senderEmail: session.email,
        recipientEmail: (session.role === 'admin' || session.role === 'operator') ? history.created_by_email : undefined,
      }
    );

    revalidatePath('/app/histories');
    revalidatePath('/admin/histories');
    return { success: true };
  } catch (error: any) {
    console.error('Cancel Employee History Error:', error);
    return { error: error.message || 'Erro ao cancelar solicitação.' };
  }
}

export async function approveEmployeeHistory(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const permissions = await getUserPermissions();
  const canApprove = session.role === 'admin' || permissions.includes('histories.approve');
  if (!canApprove) return { error: 'Sem permissão para concluir esta solicitação.' };

  try {
    await ensureEmployeeHistoriesTable();

    const history = await loadHistoryWithRelations(id);
    if (!history) return { error: 'Solicitação não encontrada.' };

    const hasAccess = await validateHistoryAccess(history, session.user_id, session.role);
    if (!hasAccess) return { error: 'Sem permissão para esta solicitação.' };

    if (history.status !== 'SUBMITTED' && history.status !== 'RECTIFIED') {
      return { error: 'Apenas solicitações pendentes ou retificadas podem ser concluídas.' };
    }

    await db.query(`
      UPDATE employee_histories
      SET status = 'COMPLETED', updated_at = (NOW() - INTERVAL '3 hours')
      WHERE id = $1
    `, [id]);

    logAudit({
      actor_user_id: session.user_id,
      actor_email: session.email,
      action: 'APPROVE_EMPLOYEE_HISTORY',
      entity_type: 'EMPLOYEE_HISTORY',
      entity_id: id,
      metadata: { requestType: history.request_type },
      success: true,
    });

    const config = getEmployeeHistoryTypeConfig(history.request_type);
    const title = getEmployeeHistoryNotificationTitle(history.request_type, getEmployeeHistoryStatusLabel('COMPLETED'));
    const message = `${session.name || session.email} concluiu ${config.emailCompletedLabel} de ${history.employee_name}.`;

    await notifyCreator(history.created_by_user_id, id, title, message, session.user_id);

    await sendEmployeeHistoryNotification('COMPLETED', {
      companyName: history.company_name,
      cnpj: history.company_cnpj,
      userName: session.name || session.email,
      employeeName: history.employee_name,
      requestLabel: config.label,
      requestSummary: getHistorySummary(history.request_type, history.employee_name),
      currentData: history.current_data || '',
      requestedChange: history.requested_change || '',
      details: history.details || '',
      effectiveDate: history.effective_date ? format(new Date(history.effective_date), 'dd/MM/yyyy') : undefined,
      senderEmail: session.email,
      recipientEmail: history.created_by_email || undefined,
    });

    revalidatePath('/app/histories');
    revalidatePath('/admin/histories');
    return { success: true };
  } catch (error: any) {
    console.error('Approve Employee History Error:', error);
    return { error: error.message || 'Erro ao concluir solicitação.' };
  }
}

export async function getEmployeeHistory(id: string) {
  const session = await getSession();
  if (!session) return null;

  try {
    await ensureEmployeeHistoriesTable();

    const history = await loadHistoryWithRelations(id);
    if (!history) return null;

    const hasAccess = await validateHistoryAccess(history, session.user_id, session.role);
    if (!hasAccess) return null;

    if (history.attachment_key) {
      try {
        history.downloadLink = await getR2DownloadLink(history.attachment_key);
      } catch (error) {
        console.error('Error generating employee history download link:', error);
        history.downloadLink = null;
      }
    }

    return history;
  } catch (error) {
    console.error('Error fetching employee history:', error);
    return null;
  }
}
