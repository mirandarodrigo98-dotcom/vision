'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export type IRStatus = 'Não Iniciado' | 'Em andamento' | 'Pendente' | 'Em Validação' | 'Cancelado' | 'Transmitido' | 'Processado' | 'Malha Fina';

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
  return rows;
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
}) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const sql = `
    INSERT INTO ir_declarations (
      name, year, phone, email, type, company_id, status, is_received, send_whatsapp, send_email, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, 'Não Iniciado', false, $7, $8, $9)
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
    session.user_id
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
      c.cnpj as company_cnpj
    FROM ir_declarations ir
    LEFT JOIN client_companies c ON ir.company_id = c.id
    WHERE ir.id = $1
  `;

  const row = await db.prepare(sql).get(id);
  return row;
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

export async function addIRComment(id: string, content: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  await db.prepare(`
    INSERT INTO ir_interactions (declaration_id, user_id, type, content)
    VALUES ($1, $2, 'comment', $3)
  `).run(id, session.user_id, content);

  revalidatePath(`/admin/pessoa-fisica/imposto-renda/${id}`);
}

export async function getIRInteractions(id: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  const sql = `
    SELECT 
      i.*,
      u.name as user_name,
      u.avatar_path as user_avatar
    FROM ir_interactions i
    LEFT JOIN users u ON i.user_id = u.id
    WHERE i.declaration_id = $1
    ORDER BY i.created_at ASC
  `;

  return await db.prepare(sql).all();
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
