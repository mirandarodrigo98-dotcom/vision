'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const societarioSchema = z.object({
  company_id: z.string(),
  data_constituicao: z.string().optional(),
  responsavel_legal: z.string().optional(),
  capital_social_centavos: z.number().int().nonnegative().optional(),
  email_institucional: z.string().email().optional().or(z.literal('')),
  endereco: z.string().optional(),
  telefone: z.string().optional(),
  status: z.enum(['EM_REGISTRO', 'ATIVA', 'INATIVA']).optional(),
});

export async function getSocietarioProfile(companyId: string) {
  const session = await getSession();
  if (!session) return null;

  if (session.role === 'client_user') {
    const hasAccess = (await db.query(`SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, companyId])).rows[0];
    if (!hasAccess) return null;
  } else if (session.role === 'operator') {
    const restricted = (await db.query(`SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, companyId])).rows[0];
    if (restricted) return null;
  }

  try {
    const profile = (await db.query(`SELECT * FROM societario_profiles WHERE company_id = $1`, [companyId])).rows[0];
    return profile || null;
  } catch {
    return null;
  }
}

export async function getSocietarioLogs(companyId: string) {
  const session = await getSession();
  if (!session) return [];

  if (session.role === 'client_user') {
    const hasAccess = (await db.query(`SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, companyId])).rows[0];
    if (!hasAccess) return [];
  } else if (session.role === 'operator') {
    const restricted = (await db.query(`SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, companyId])).rows[0];
    if (restricted) return [];
  }

  try {
    const logs = (await db.query(`SELECT sl.*, u.name as actor_name, u.email as actor_email FROM societario_logs sl LEFT JOIN users u ON u.id = sl.actor_user_id WHERE sl.company_id = $1 ORDER BY sl.created_at DESC`, [companyId])).rows;
    return logs as any[];
  } catch {
    return [];
  }
}

export async function listLogs(companyId: string) {
  const logs = await getSocietarioLogs(companyId);
  return { logs };
}

async function logEvent(companyId: string, tipo_evento: string, campo_alterado?: string, valor_anterior?: string, valor_novo?: string, motivo?: string, actor_user_id?: string) {
  const id = randomUUID();
  await db.query(`INSERT INTO societario_logs (id, company_id, tipo_evento, campo_alterado, valor_anterior, valor_novo, motivo, actor_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [id, companyId, tipo_evento, campo_alterado || null, valor_anterior || null, valor_novo || null, motivo || null, actor_user_id || null]);
}

export async function upsertSocietarioProfile(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  let hasPermission = false;
  if (session.role === 'admin') hasPermission = true;
  else {
    const perms = (await db.query(`SELECT permission FROM role_permissions WHERE role = $1`, [session.role])).rows as { permission: string }[];
    hasPermission = perms.map(p => p.permission).includes('societario.edit');
  }
  if (!hasPermission) return { error: 'Sem permissão' };

  const input = {
    company_id: formData.get('company_id') as string,
    data_constituicao: (formData.get('data_constituicao') as string) || undefined,
    responsavel_legal: (formData.get('responsavel_legal') as string) || undefined,
    capital_social_centavos: formData.get('capital_social_centavos') ? Number(formData.get('capital_social_centavos')) : undefined,
    email_institucional: (formData.get('email_institucional') as string) || undefined,
    endereco: (formData.get('endereco') as string) || undefined,
    telefone: (formData.get('telefone') as string) || undefined,
    status: (formData.get('status') as string) as any,
  };

  const data = societarioSchema.parse(input);
  if (!data.company_id) return { error: 'Empresa obrigatória' };

  if (session.role === 'client_user') {
    const hasAccess = (await db.query(`SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, data.company_id])).rows[0];
    if (!hasAccess) return { error: 'Sem permissão para esta empresa.' };
  } else if (session.role === 'operator') {
    const restricted = (await db.query(`SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, data.company_id])).rows[0];
    if (restricted) return { error: 'Sem permissão para esta empresa.' };
  }

  const existing = (await db.query(`SELECT * FROM societario_profiles WHERE company_id = $1`, [data.company_id])).rows[0] as any;

  const insertSql =
    `INSERT INTO societario_profiles (company_id, data_constituicao, responsavel_legal, capital_social_centavos, email_institucional, endereco, telefone, status, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) ` +
    'ON CONFLICT(company_id) DO UPDATE SET data_constituicao=excluded.data_constituicao, responsavel_legal=excluded.responsavel_legal, capital_social_centavos=excluded.capital_social_centavos, email_institucional=excluded.email_institucional, endereco=excluded.endereco, telefone=excluded.telefone, status=excluded.status, updated_at=excluded.updated_at';

  await db.query(insertSql, [data.company_id, data.data_constituicao || null, data.responsavel_legal || null, data.capital_social_centavos ?? null, data.email_institucional || null, data.endereco || null, data.telefone || null, data.status || 'EM_REGISTRO']);

  if (existing) {
    const fields = ['data_constituicao','responsavel_legal','capital_social_centavos','email_institucional','endereco','telefone','status'] as const;
    for (const f of fields) {
      const beforeVal = existing[f];
      const afterVal = (data as any)[f] ?? null;
      const changed = String(beforeVal ?? '') !== String(afterVal ?? '');
      if (changed) {
        await logEvent(
          data.company_id,
          'UPDATE',
          f,
          beforeVal != null ? String(beforeVal) : undefined,
          afterVal != null ? String(afterVal) : undefined,
          undefined,
          session.user_id
        );
      }
    }
  } else {
    await logEvent(data.company_id, 'CREATE', undefined, undefined, undefined, undefined, session.user_id);
  }

  revalidatePath('/admin/societario');
  return { success: true };
}

export async function findSocioByCpf(cpf: string) {
  const session = await getSession();
  if (!session) return null;
  try {
    const digits = String(cpf || '').replace(/\D/g, '');
    const socio = (await db.query(`SELECT * FROM societario_socios WHERE cpf = $1`, [digits])).rows[0];
    return socio || null;
  } catch {
    return null;
  }
}

export async function searchSocios(term: string) {
  const session = await getSession();
  if (!session) return [];
  try {
    const cleanTerm = term.trim();
    if (!cleanTerm) return [];
    
    // Check if it's CPF (digits only)
    const digitsOnly = cleanTerm.replace(/\D/g, '');
    if (digitsOnly.length > 3) {
       const socios = (await db.query(`SELECT * FROM societario_socios WHERE cpf LIKE $1 LIMIT 10`, [`%${digitsOnly}%`])).rows;
       return socios as any[];
    }

    // Search by name
    const socios = (await db.query(`SELECT * FROM societario_socios WHERE LOWER(nome) LIKE LOWER($1) LIMIT 10`, [`%${cleanTerm}%`])).rows;
    return socios as any[];
  } catch (err) {
    console.error('Error searching socios:', err);
    return [];
  }
}

export async function changeStatus(companyId: string, status: 'EM_REGISTRO' | 'ATIVA' | 'INATIVA', motivo: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  if (session.role === 'client_user') {
    const hasAccess = (await db.query(`SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, companyId])).rows[0];
    if (!hasAccess) return { error: 'Sem permissão para esta empresa.' };
  } else if (session.role === 'operator') {
    const restricted = (await db.query(`SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, companyId])).rows[0];
    if (restricted) return { error: 'Sem permissão para esta empresa.' };
  }

  let hasPermission = false;
  if (session.role === 'admin') hasPermission = true;
  else {
    const perms = (await db.query(`SELECT permission FROM role_permissions WHERE role = $1`, [session.role])).rows as { permission: string }[];
    hasPermission = perms.map(p => p.permission).includes('societario.edit');
  }
  if (!hasPermission) return { error: 'Sem permissão' };

  const existing = (await db.query(`SELECT status FROM societario_profiles WHERE company_id = $1`, [companyId])).rows[0] as { status: string } | undefined;

  await db.query(`
    UPDATE societario_profiles
    SET status = $1, updated_at = NOW()
    WHERE company_id = $2
  `, [status, companyId]);

  await logEvent(
    companyId,
    'STATUS_CHANGE',
    'status',
    existing?.status ?? undefined,
    status,
    motivo,
    session.user_id
  );

  revalidatePath('/admin/societario');
  return { success: true };
}
