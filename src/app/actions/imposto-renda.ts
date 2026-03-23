'use server';

import { db } from '@/db';
import { getSession } from './auth';
import { revalidatePath } from 'next/cache';
import { uploadToR2, getR2DownloadLink } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

export type IRStatus = 'Não Iniciado' | 'Iniciado' | 'Pendente' | 'Validada' | 'Transmitida' | 'Processada' | 'Malha Fina' | 'Retificadora' | 'Reaberta' | 'Cancelada';

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
}) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const sql = `
    INSERT INTO ir_declarations (
      name, year, phone, email, type, company_id, status, is_received, send_whatsapp, send_email, created_by,
      indicated_by_user_id, indicated_by_partner_id, service_value
    ) VALUES ($1, $2, $3, $4, $5, $6, 'Não Iniciado', false, $7, $8, $9, $10, $11, $12)
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
    data.service_value || null
  );

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

  await db.prepare(`
    UPDATE ir_declarations 
    SET indicated_by_user_id = $1, indicated_by_partner_id = $2, service_value = $3, updated_at = NOW() 
    WHERE id = $4
  `).run(data.indicated_by_user_id || null, data.indicated_by_partner_id || null, data.service_value || null, id);

  revalidatePath('/admin/pessoa-fisica/imposto-renda');
  revalidatePath(`/admin/pessoa-fisica/imposto-renda/${id}`);
}

export async function updateIRStatus(id: string, newStatus: IRStatus, justification?: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const decl = await getIRDeclarationById(id);
  if (!decl) throw new Error('Declaration not found');

  const oldStatus = decl.status;

  await db.transaction(async () => {
    await db.prepare('UPDATE ir_declarations SET status = $1, updated_at = NOW() WHERE id = $2').run(newStatus, id);

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
      const fileName = \`ir_attachments/\${id}/\${uuidv4()}.\${fileExtension}\`;
      
      const uploadResult = await uploadToR2(buffer, fileName, file.type);
      
      if (uploadResult) {
        await db.prepare(`
          INSERT INTO ir_attachments (interaction_id, original_name, size_bytes, url)
          VALUES ($1, $2, $3, $4)
        `).run(interactionId, file.name, file.size, uploadResult.fileKey);
      }
    }
  })();

  revalidatePath(\`/admin/pessoa-fisica/imposto-renda/\${id}\`);
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
    if (row.attachments && Array.isArray(row.attachments)) {
      row.attachments = await Promise.all(row.attachments.map(async (att: any) => {
        let downloadLink = att.url;
        try {
          if (att.url && !att.url.startsWith('http')) {
             if (process.env.R2_PUBLIC_DOMAIN) {
               downloadLink = \`\${process.env.R2_PUBLIC_DOMAIN}/\${att.url}\`;
             } else {
               downloadLink = await getR2DownloadLink(att.url);
             }
          }
        } catch (e) {
           console.error('Error generating download link for', att.url);
        }
        return { ...att, url: downloadLink };
      }));
    }
    return row;
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
