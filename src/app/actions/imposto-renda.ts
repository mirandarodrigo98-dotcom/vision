'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { uploadToR2, getR2DownloadLink } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

export type IRStatus = 'Não Iniciado' | 'Iniciado' | 'Pendente' | 'Validada' | 'Transmitida' | 'Processada' | 'Malha Fina' | 'Retificadora' | 'Reaberta' | 'Cancelada';

export interface IRFile {
  id: string;
  declaration_id: string;
  file_name: string;
  file_key: string;
  file_url: string;
  uploaded_by: string | null;
  uploaded_by_name?: string;
  created_at: string;
}

export interface IRDeclaration {
  id: string;
  name: string;
  year: string;
  phone: string | null;
  email: string | null;
  type: 'Sócio' | 'Particular';
  company_id: string | null;
  status: IRStatus;
  is_received: boolean;
  send_whatsapp: boolean;
  send_email: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company_name?: string;
  company_cnpj?: string;
  cpf?: string | null;
  priority?: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  indicated_by_user_id?: string | null;
  indicated_by_partner_id?: string | null;
  indicated_by_user_name?: string;
  indicated_by_partner_name?: string;
  user_commission_percent?: number | null;
  partner_commission_percent?: number | null;
  service_value?: number | null;
  receipt_date?: string | null;
  receipt_method?: string | null;
  receipt_account?: string | null;
  receipt_attachment_url?: string | null;
}

export async function getIRDeclarations(): Promise<IRDeclaration[]> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const sql = `
    SELECT 
      ir.*,
      c.razao_social as company_name,
      c.cnpj as company_cnpj
    FROM ir_declarations ir
    LEFT JOIN client_companies c ON ir.company_id = c.id
    ORDER BY ir.created_at DESC
  `;

  const rows = await db.prepare(sql).all();
  return JSON.parse(JSON.stringify(rows));
}

export async function getIRStats() {
  const declarations = await getIRDeclarations();
  
  const statusCounts = declarations.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value
  }));
}

export async function getIRReceiptStats() {
  const declarations = await getIRDeclarations();
  const receivedDecls = declarations.filter(d => d.is_received);
  const notReceivedDecls = declarations.filter(d => !d.is_received);
  
  const receivedCount = receivedDecls.length;
  const notReceivedCount = notReceivedDecls.length;
  
  const receivedValue = receivedDecls.reduce((sum, d) => sum + (d.service_value || 0), 0);
  const notReceivedValue = notReceivedDecls.reduce((sum, d) => sum + (d.service_value || 0), 0);

  return [
    { name: 'Recebidas', value: receivedCount, moneyValue: receivedValue },
    { name: 'Não Recebidas', value: notReceivedCount, moneyValue: notReceivedValue }
  ];
}

export async function deleteIRDeclaration(id: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      throw new Error('Apenas administradores podem excluir declarações');
    }

    await db.transaction(async () => {
      // Deletar anexos de interações desta declaração
      await db.prepare(`
        DELETE FROM ir_attachments 
        WHERE interaction_id IN (
          SELECT id FROM ir_interactions WHERE declaration_id = $1
        )
      `).run(id);

      // Tentar deletar de outras tabelas relacionadas, se existirem
      try {
        await db.prepare('DELETE FROM ir_receipts WHERE declaration_id = $1').run(id);
      } catch(e) { /* ignore if table doesn't exist */ }

      // Deletar interações
      await db.prepare('DELETE FROM ir_interactions WHERE declaration_id = $1').run(id);

      // Finalmente, deletar a declaração
      await db.prepare('DELETE FROM ir_declarations WHERE id = $1').run(id);
    })();
    
    // NOTA: A revalidação pode falhar se a página atual (/.../[id]) não existir mais
    // Então revalidamos apenas a lista principal aqui
    revalidatePath('/admin/pessoa-fisica/imposto-renda');
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting IR declaration:', error);
    throw new Error('Erro ao excluir declaração: ' + error.message);
  }
}

export async function updateIRContributor(
  id: string, 
  data: { 
    name: string; 
    cpf: string;
    phone: string; 
    email: string; 
    type: string; 
    company_id?: string | null 
  }
) {
  try {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    await db.transaction(async () => {
      await db.prepare(`
        UPDATE ir_declarations 
        SET name = $1, cpf = $2, phone = $3, email = $4, type = $5, company_id = $6, updated_at = NOW()
        WHERE id = $7
      `).run(data.name, data.cpf, data.phone || null, data.email || null, data.type, data.company_id || null, id);

      await db.prepare(`
        INSERT INTO ir_interactions (declaration_id, user_id, type, content)
        VALUES ($1, $2, 'comment', $3)
      `).run(id, session.user_id, 'Dados do contribuinte atualizados');
    })();

    revalidatePath('/admin/pessoa-fisica/imposto-renda');
    revalidatePath(`/admin/pessoa-fisica/imposto-renda/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating IR contributor:', error);
    throw new Error('Erro ao atualizar contribuinte: ' + error.message);
  }
}

export async function createIRDeclaration(data: {
  name: string;
  year: string;
  phone?: string;
  email?: string;
  type: 'Sócio' | 'Particular';
  company_id?: string;
  send_whatsapp?: boolean;
  send_email?: boolean;
  indicated_by_user_id?: string;
  indicated_by_partner_id?: string;
  service_value?: number;
  cpf?: string;
  priority?: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
}) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const sql = `
    INSERT INTO ir_declarations (
      name, year, phone, email, type, company_id, status, is_received, send_whatsapp, send_email, created_by,
      indicated_by_user_id, indicated_by_partner_id, service_value, cpf, priority
    ) VALUES ($1, $2, $3, $4, $5, $6, 'Não Iniciado', false, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id
  `;

  const result = await db.prepare(sql).get(
    data.name,
    data.year,
    data.phone || null,
    data.email || null,
    data.type,
    data.company_id || null,
    data.send_whatsapp ? true : false,
    data.send_email ? true : false,
    session.user_id,
    data.indicated_by_user_id || null,
    data.indicated_by_partner_id || null,
    data.service_value || null,
    data.cpf || null,
    data.priority || 'Média'
  ) as { id: string };

  await db.prepare(`
    INSERT INTO ir_interactions (declaration_id, user_id, type, content)
    VALUES ($1, $2, 'creation', 'Declaração Criada')
  `).run(result.id, session.user_id);

  revalidatePath('/admin/pessoa-fisica/imposto-renda');
  return result;
}

export async function getIRDeclarationById(id: string): Promise<IRDeclaration | undefined> {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const sql = `
    SELECT 
      ir.*,
      c.razao_social as company_name,
      c.cnpj as company_cnpj,
      u.name as indicated_by_user_name,
      u.ir_commission_percent as user_commission_percent,
      p.name as indicated_by_partner_name,
      p.commission_percent as partner_commission_percent
    FROM ir_declarations ir
    LEFT JOIN client_companies c ON ir.company_id = c.id
    LEFT JOIN users u ON ir.indicated_by_user_id = u.id
    LEFT JOIN ir_partners p ON ir.indicated_by_partner_id = p.id
    WHERE ir.id = $1
  `;

  const row = await db.prepare(sql).get(id);
  if (!row) return undefined;
  
  const declaration = JSON.parse(JSON.stringify(row));
  
  if (declaration.receipt_attachment_url && !declaration.receipt_attachment_url.startsWith('http')) {
    if (process.env.R2_PUBLIC_DOMAIN) {
      declaration.receipt_attachment_url = `${process.env.R2_PUBLIC_DOMAIN}/${declaration.receipt_attachment_url}`;
    } else {
      try {
        declaration.receipt_attachment_url = await getR2DownloadLink(declaration.receipt_attachment_url);
      } catch (e) {
        console.error('Error generating download link for receipt attachment', e);
      }
    }
  }
  
  return declaration;
}

export async function updateIRIndication(id: string, data: { indicated_by_user_id?: string | null, indicated_by_partner_id?: string | null, service_value?: number | null }) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  const prev = await getIRDeclarationById(id);
  await db.transaction(async () => {
    await db.prepare(`
      UPDATE ir_declarations 
      SET indicated_by_user_id = $1, indicated_by_partner_id = $2, service_value = $3, updated_at = NOW() 
      WHERE id = $4
    `).run(data.indicated_by_user_id || null, data.indicated_by_partner_id || null, data.service_value || null, id);
    const fmtMoney = (n?: number | null) => {
      if (n === null || n === undefined) return '—';
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
    };
    const prevType = prev?.indicated_by_user_id ? 'Usuário Interno' : (prev?.indicated_by_partner_id ? 'Parceiro Externo' : 'Nenhuma');
    const newType = data.indicated_by_user_id ? 'Usuário Interno' : (data.indicated_by_partner_id ? 'Parceiro Externo' : 'Nenhuma');
    const content = `Indicação atualizada: Tipo ${prevType} → ${newType}; Valor ${fmtMoney(prev?.service_value)} → ${fmtMoney(data.service_value ?? null)}`;
    await db.prepare(`
      INSERT INTO ir_interactions (declaration_id, user_id, type, content)
      VALUES ($1, $2, 'comment', $3)
    `).run(id, session.user_id, content);
  })();

  revalidatePath('/admin/pessoa-fisica/imposto-renda');
  revalidatePath(`/admin/pessoa-fisica/imposto-renda/${id}`);
}

export async function updateIRPriority(id: string, priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica') {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  const decl = await getIRDeclarationById(id);
  const oldPriority = decl?.priority || null;
  await db.transaction(async () => {
    await db.prepare(`
      UPDATE ir_declarations SET priority = $1, updated_at = NOW() WHERE id = $2
    `).run(priority, id);
    await db.prepare(`
      INSERT INTO ir_interactions (declaration_id, user_id, type, content)
      VALUES ($1, $2, 'priority_change', $3)
    `).run(id, session.user_id, `Prioridade alterada de ${oldPriority ?? '—'} para ${priority}`);
  })();
  revalidatePath('/admin/pessoa-fisica/imposto-renda');
  revalidatePath(`/admin/pessoa-fisica/imposto-renda/${id}`);
}

export async function updateIRStatus(id: string, newStatus: IRStatus, justification?: string, processadaData?: any) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const decl = await getIRDeclarationById(id);
  if (!decl) throw new Error('Declaration not found');

  const oldStatus = decl.status;

  await db.transaction(async () => {
    if (newStatus === 'Processada' && processadaData) {
      await db.prepare(`
        UPDATE ir_declarations 
        SET status = $1, 
            updated_at = NOW(),
            outcome_type = $2,
            outcome_value = $3,
            payment_method = $4,
            installments_count = $5,
            installment_value = $6
        WHERE id = $7
      `).run(
        newStatus, 
        processadaData.outcome_type, 
        processadaData.outcome_value, 
        processadaData.payment_method || null, 
        processadaData.installments_count || null, 
        processadaData.installment_value || null, 
        id
      );
    } else {
      await db.prepare('UPDATE ir_declarations SET status = $1, updated_at = NOW() WHERE id = $2').run(newStatus, id);
    }

    await db.prepare(`
      INSERT INTO ir_interactions (declaration_id, user_id, type, content, old_status, new_status)
      VALUES ($1, $2, 'status_change', $3, $4, $5)
    `).run(id, session.user_id, justification || null, oldStatus, newStatus);
  })();

  revalidatePath('/admin/pessoa-fisica/imposto-renda');
  revalidatePath(`/admin/pessoa-fisica/imposto-renda/${id}`);
}

export async function addIRComment(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const content = formData.get('content') as string;
  const files = formData.getAll('attachments') as File[];

  const result = await db.transaction(async () => {
    const interactionId = uuidv4();
    await db.prepare(`
      INSERT INTO ir_interactions (id, declaration_id, user_id, type, content)
      VALUES ($1, $2, $3, 'comment', $4)
    `).run(interactionId, id, session.user_id, content);

    for (const file of files) {
      if (file.size > 2 * 1024 * 1024) continue; // 2MB limit
      
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileExtension = file.name.split('.').pop();
      const fileName = `ir_attachments/${id}/${uuidv4()}.${fileExtension}`;
      
      const uploadResult = await uploadToR2(buffer, fileName, file.type);
      
      if (uploadResult) {
        await db.prepare(`
          INSERT INTO ir_attachments (interaction_id, original_name, size_bytes, url)
          VALUES ($1, $2, $3, $4)
        `).run(interactionId, file.name, file.size, uploadResult.fileKey);
      }
    }
  })();

  revalidatePath(`/admin/pessoa-fisica/imposto-renda/${id}`);
  return { success: true };
}

export async function getIRFiles(declarationId: string): Promise<IRFile[]> {
  try {
    const res = await db.prepare(`
      SELECT f.*, u.name as uploaded_by_name
      FROM ir_files f
      LEFT JOIN users u ON f.uploaded_by = u.id
      WHERE f.declaration_id = $1
      ORDER BY f.created_at DESC
    `).all(declarationId);
    return res as IRFile[];
  } catch (error) {
    console.error('Error fetching IR files:', error);
    return [];
  }
}

export async function deleteIRFile(fileId: string, declarationId: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  
  await db.prepare(`DELETE FROM ir_files WHERE id = $1`).run(fileId);
  
  await db.prepare(`
    INSERT INTO ir_interactions (declaration_id, user_id, type, content)
    VALUES ($1, $2, 'comment', 'Arquivo removido')
  `).run(declarationId, session.user_id);
  
  revalidatePath(`/admin/pessoa-fisica/imposto-renda/${declarationId}`);
}

export async function transmitIRDeclaration(
  declarationId: string,
  sendWhatsapp: boolean,
  sendEmail: boolean,
  formData: FormData,
  restitutionValue?: string
) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const declaration = await getIRDeclarationById(declarationId);
  if (!declaration) throw new Error('Declaração não encontrada');

  const files = formData.getAll('files') as File[];
  const uploadedFiles: { fileName: string, fileUrl: string, base64: string, mimeType: string }[] = [];

  const expectedCpf = (declaration.cpf || '').replace(/\D/g, '');
  const expectedYear = declaration.year;

  for (const file of files) {
    const parts = file.name.split('-');
    if (parts.length < 3) throw new Error(`Arquivo ${file.name} ignorado: formato de nome inválido.`);
    if (parts[0].replace(/\D/g, '') !== expectedCpf) throw new Error(`Arquivo ${file.name} ignorado: CPF incompatível.`);
    if (parts[1].toUpperCase() !== 'IRPF') throw new Error(`Arquivo ${file.name} ignorado: Não contém a sigla IRPF.`);
    if (parts[2] !== expectedYear) throw new Error(`Arquivo ${file.name} ignorado: Exercício incompatível.`);
  }

  // Upload files to R2 and save in ir_files
  await db.transaction(async () => {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileKey = `irpf/${declarationId}/${uuidv4()}-${file.name}`;
      const uploadResult = await uploadToR2(buffer, fileKey, file.type);
      
      if (uploadResult) {
        await db.prepare(`
          INSERT INTO ir_files (declaration_id, file_name, file_key, file_url, uploaded_by)
          VALUES ($1, $2, $3, $4, $5)
        `).run(declarationId, file.name, uploadResult.fileKey, uploadResult.downloadLink, session.user_id);
        
        uploadedFiles.push({
          fileName: file.name,
          fileUrl: uploadResult.downloadLink,
          base64: buffer.toString('base64'),
          mimeType: file.type
        });
      }
    }

    // Change status
    await db.prepare(`
      UPDATE ir_declarations SET status = 'Transmitida', updated_at = NOW() WHERE id = $1
    `).run(declarationId);

    await db.prepare(`
      INSERT INTO ir_interactions (declaration_id, user_id, type, old_status, new_status, content)
      VALUES ($1, $2, 'status_change', $3, 'Transmitida', 'Motivo: Status alterado para Transmitida')
    `).run(declarationId, session.user_id, declaration.status);
  })();

  // Send messages if requested
  const contactName = declaration.name;
  const year = declaration.year;
  
  const textMessage = `_*Essa é uma mensagem automática. Não é necessário responder*_

Olá *${contactName}*
Estamos enviando a sua declaração de Imposto de Renda Exercício *${year}* que foi transmitida com sucesso.${
    restitutionValue && restitutionValue.trim() !== '' 
      ? `\nO valor da sua restituição foi de *R$ ${restitutionValue.trim()}*`
      : ''
  }
A partir de agora passamos a monitorar o processamento junto à Receita Federal.
Caso seja necessário faremos contato.
Em caso de dúvidas entre em contato com a nossa Central de Atendimento através do número (24) 3026-5648 ou 3337-4865.

Atenciosamente
*NZD Contabilidade*
_Departamento Tributário_`;

  let messagesErrors = [];

  if (sendWhatsapp && declaration.phone) {
    try {
      const { getDigisacConfig, sendDigisacMessage } = await import('./integrations/digisac');
      const config = await getDigisacConfig();

      if (uploadedFiles.length > 0) {
        // Enviar os arquivos primeiro sem texto (para evitar erro 500 no digisac)
        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          const res = await sendDigisacMessage({
            number: declaration.phone,
            serviceId: config.connection_phone,
            body: null,
            base64File: `data:${file.mimeType};base64,${file.base64}`,
            fileName: file.fileName
          });
          if (!res.success) throw new Error(res.error || 'Erro ao enviar arquivo via Digisac');
        }
        
        // Depois enviar o texto principal
        const resText = await sendDigisacMessage({
          number: declaration.phone,
          serviceId: config.connection_phone,
          body: textMessage
        });
        if (!resText.success) throw new Error(resText.error || 'Erro ao enviar mensagem de texto via Digisac');
      } else {
        const resText = await sendDigisacMessage({
          number: declaration.phone,
          serviceId: config.connection_phone,
          body: textMessage
        });
        if (!resText.success) throw new Error(resText.error || 'Erro ao enviar mensagem de texto via Digisac');
      }
    } catch (e: any) {
      console.error("Erro ao enviar WhatsApp:", e);
      messagesErrors.push(`WhatsApp: ${e.message}`);
    }
  }

  if (sendEmail && declaration.email) {
    try {
      // Import email sender
      const { sendEmail: mailerSend } = await import('@/lib/email/resend');
      const attachments = uploadedFiles.map(f => ({
        filename: f.fileName,
        content: Buffer.from(f.base64, 'base64'),
        contentType: f.mimeType
      }));
      
      const htmlMessage = textMessage.replace(/\n/g, '<br/>').replace(/\*(.*?)\*/g, '<strong>$1</strong>');

      await mailerSend({
        to: declaration.email,
        subject: `Declaração de Imposto de Renda Transmitida - Exercício ${year}`,
        html: htmlMessage,
        category: 'irpf_transmissao',
        attachments
      });
    } catch (e: any) {
      console.error("Erro ao enviar Email:", e);
      messagesErrors.push(`E-mail: ${e.message}`);
    }
  }

  revalidatePath('/admin/pessoa-fisica/imposto-renda');
  revalidatePath(`/admin/pessoa-fisica/imposto-renda/${declarationId}`);
  
  if (messagesErrors.length > 0) {
      return { success: true, warning: `Declaração transmitida e salva, mas houve falha no envio: ${messagesErrors.join(', ')}` };
  }
  
  return { success: true };
}

export async function getIRInteractions(id: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const sql = `
    SELECT 
      i.*,
      u.name as user_name,
      u.avatar_path as user_avatar,
      COALESCE(
        json_agg(
          json_build_object(
            'id', a.id,
            'original_name', a.original_name,
            'size', a.size_bytes,
            'url', a.url
          )
        ) FILTER (WHERE a.id IS NOT NULL),
        '[]'
      ) as attachments
    FROM ir_interactions i
    LEFT JOIN users u ON i.user_id = u.id
    LEFT JOIN ir_attachments a ON i.id = a.interaction_id
    WHERE i.declaration_id = $1
    GROUP BY i.id, u.name, u.avatar_path
    ORDER BY i.created_at ASC
  `;

  const rows = await db.prepare(sql).all(id);
  
  // Transform attachments to include download links
  const formattedRows = await Promise.all(rows.map(async (row: any) => {
    let attachments = row.attachments;
    if (typeof attachments === 'string') {
      try { attachments = JSON.parse(attachments); } catch(e) { attachments = []; }
    }
    
    if (attachments && Array.isArray(attachments)) {
      attachments = await Promise.all(attachments.map(async (att: any) => {
        let downloadLink = att.url;
        try {
          if (att.url && !att.url.startsWith('http')) {
             if (process.env.R2_PUBLIC_DOMAIN) {
               downloadLink = `${process.env.R2_PUBLIC_DOMAIN}/${att.url}`;
             } else {
               downloadLink = await getR2DownloadLink(att.url);
             }
          }
        } catch (e) {
           console.error('Error generating download link for', att.url);
        }
        return { ...att, url: downloadLink };
      }));
    } else {
      attachments = [];
    }
    return { ...row, attachments };
  }));

  return JSON.parse(JSON.stringify(formattedRows));
}

export async function registerIRReceipt(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const receipt_date = formData.get('receipt_date') as string;
  const receipt_method = formData.get('receipt_method') as string;
  const receipt_account = formData.get('receipt_account') as string;
  const file = formData.get('attachment') as File | null;

  let attachment_url: string | null = null;

  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Arquivo excede o limite de 5MB');
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = file.name.split('.').pop();
    const fileName = `ir_receipts/${id}/${uuidv4()}.${fileExtension}`;
    
    const uploadResult = await uploadToR2(buffer, fileName, file.type);
    if (uploadResult) {
      attachment_url = uploadResult.fileKey; // We'll store fileKey and maybe generate signed url on read or use public url
    }
  }

  await db.transaction(async () => {
    await db.prepare(`
      UPDATE ir_declarations 
      SET 
        is_received = true, 
        receipt_date = $1, 
        receipt_method = $2, 
        receipt_account = $3, 
        receipt_attachment_url = $4,
        updated_at = NOW() 
      WHERE id = $5
    `).run(
      receipt_date,
      receipt_method,
      receipt_account,
      attachment_url,
      id
    );

    await db.prepare(`
      INSERT INTO ir_interactions (declaration_id, user_id, type, content)
      VALUES ($1, $2, 'comment', $3)
    `).run(id, session.user_id, `Pagamento recebido via ${receipt_method} na conta ${receipt_account}`);
  })();

  revalidatePath('/admin/pessoa-fisica/imposto-renda');
  revalidatePath(`/admin/pessoa-fisica/imposto-renda/${id}`);
}

export async function markIRAsReceived(id: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  await db.transaction(async () => {
    await db.prepare('UPDATE ir_declarations SET is_received = true, updated_at = NOW() WHERE id = $1').run(id);

    await db.prepare(`
      INSERT INTO ir_interactions (declaration_id, user_id, type, content)
      VALUES ($1, $2, 'comment', 'Pagamento recebido (Quitação)')
    `).run(id, session.user_id);
  })();

  revalidatePath('/admin/pessoa-fisica/imposto-renda');
  revalidatePath(`/admin/pessoa-fisica/imposto-renda/${id}`);
}

export async function deleteIRReceipt(id: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  await db.transaction(async () => {
    await db.prepare(`
      UPDATE ir_declarations 
      SET 
        is_received = false, 
        receipt_date = NULL, 
        receipt_method = NULL, 
        receipt_account = NULL, 
        receipt_attachment_url = NULL,
        updated_at = NOW()
      WHERE id = $1
    `).run(id);
    await db.prepare(`
      INSERT INTO ir_interactions (declaration_id, user_id, type, content)
      VALUES ($1, $2, 'comment', 'Recebimento excluído')
    `).run(id, session.user_id);
  })();
  revalidatePath('/admin/pessoa-fisica/imposto-renda');
  revalidatePath(`/admin/pessoa-fisica/imposto-renda/${id}`);
  return { success: true };
}

export async function getCompanyForReceipt(companyName: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  
  const company = await db.prepare(`
    SELECT id, razao_social, nome, cnpj, telefone, email_contato, 
           address_type, address_street, address_number, address_complement, 
           address_neighborhood, address_zip_code, municipio, uf
    FROM client_companies
    WHERE UPPER(razao_social) LIKE UPPER($1) || '%' OR UPPER(nome) LIKE UPPER($1) || '%'
    LIMIT 1
  `).get(companyName);
  
  return company ? JSON.parse(JSON.stringify(company)) : null;
}

export async function saveIRReceiptPDF(id: string, base64Pdf: string, companyName: string, fileName: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  
  // base64Pdf usually comes as 'data:application/pdf;base64,JVBERi...' or just the base64 string
  const base64Data = base64Pdf.includes('base64,') ? base64Pdf.split('base64,')[1] : base64Pdf;
  const buffer = Buffer.from(base64Data, 'base64');
  
  const path = `ir_receipts_pdf/${id}/${uuidv4()}.pdf`;
  let upload = null;
  try {
    upload = await uploadToR2(buffer, path, 'application/pdf');
  } catch (error) {
    console.error('Failed to upload receipt to R2:', error);
  }
  
  let publicUrl = upload?.fileKey || '';
  if (publicUrl && !publicUrl.startsWith('http')) {
    try {
      publicUrl = process.env.R2_PUBLIC_DOMAIN ? `${process.env.R2_PUBLIC_DOMAIN}/${publicUrl}` : (await getR2DownloadLink(publicUrl));
    } catch (error) {
      console.error('Failed to get R2 download link:', error);
      publicUrl = '';
    }
  }
  
  await db.transaction(async () => {
    const interactionId = uuidv4();
    await db.prepare(`
      INSERT INTO ir_interactions (id, declaration_id, user_id, type, content)
      VALUES ($1, $2, $3, 'document', $4)
    `).run(interactionId, id, session.user_id, `Recibo gerado (${companyName})`);
    
    await db.prepare(`
      INSERT INTO ir_attachments (interaction_id, original_name, size_bytes, url)
      VALUES ($1, $2, $3, $4)
    `).run(interactionId, fileName, buffer.length, upload?.fileKey || publicUrl);
  })();
  
  revalidatePath(`/admin/pessoa-fisica/imposto-renda/${id}`);
  return { success: true, url: publicUrl };
}
