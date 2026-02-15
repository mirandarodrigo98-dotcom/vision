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
  try {
    const profile = await db
      .prepare('SELECT * FROM societario_profiles WHERE company_id = ?')
      .get(companyId);
    return profile || null;
  } catch {
    return null;
  }
}

export async function getSocietarioLogs(companyId: string) {
  const session = await getSession();
  if (!session) return [];
  try {
    const logs = await db
      .prepare(
        'SELECT sl.*, u.name as actor_name, u.email as actor_email FROM societario_logs sl LEFT JOIN users u ON u.id = sl.actor_user_id WHERE sl.company_id = ? ORDER BY sl.created_at DESC'
      )
      .all(companyId);
    return logs as any[];
  } catch {
    return [];
  }
}

async function logEvent(companyId: string, tipo_evento: string, campo_alterado?: string, valor_anterior?: string, valor_novo?: string, motivo?: string, actor_user_id?: string) {
  const id = randomUUID();
  await db
    .prepare(
      'INSERT INTO societario_logs (id, company_id, tipo_evento, campo_alterado, valor_anterior, valor_novo, motivo, actor_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .run(id, companyId, tipo_evento, campo_alterado || null, valor_anterior || null, valor_novo || null, motivo || null, actor_user_id || null);
}

export async function upsertSocietarioProfile(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  let hasPermission = false;
  if (session.role === 'admin') hasPermission = true;
  else {
    const perms = await db.prepare('SELECT permission FROM role_permissions WHERE role = ?').all(session.role) as { permission: string }[];
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

  const existing = await db
    .prepare('SELECT * FROM societario_profiles WHERE company_id = ?')
    .get(data.company_id) as any;

  const insertSql =
    'INSERT INTO societario_profiles (company_id, data_constituicao, responsavel_legal, capital_social_centavos, email_institucional, endereco, telefone, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\')) ' +
    'ON CONFLICT(company_id) DO UPDATE SET data_constituicao=excluded.data_constituicao, responsavel_legal=excluded.responsavel_legal, capital_social_centavos=excluded.capital_social_centavos, email_institucional=excluded.email_institucional, endereco=excluded.endereco, telefone=excluded.telefone, status=excluded.status, updated_at=excluded.updated_at';

  await db
    .prepare(insertSql)
    .run(
      data.company_id,
      data.data_constituicao || null,
      data.responsavel_legal || null,
      data.capital_social_centavos ?? null,
      data.email_institucional || null,
      data.endereco || null,
      data.telefone || null,
      data.status || 'EM_REGISTRO'
    );

  if (existing) {
    const fields = ['data_constituicao','responsavel_legal','capital_social_centavos','email_institucional','endereco','telefone','status'] as const;
    for (const f of fields) {
      const beforeVal = existing[f];
      const afterVal = (data as any)[f] ?? null;
      const changed = String(beforeVal ?? '') !== String(afterVal ?? '');
      if (changed) {
        await logEvent(data.company_id, 'UPDATE', f, beforeVal != null ? String(beforeVal) : null, afterVal != null ? String(afterVal) : null, undefined, session.user_id);
      }
    }
  } else {
    await logEvent(data.company_id, 'CREATE', undefined, undefined, undefined, undefined, session.user_id);
  }

  revalidatePath('/admin/societario');
  return { success: true };
}
