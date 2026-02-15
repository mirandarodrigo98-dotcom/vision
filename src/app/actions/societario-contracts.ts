'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';

export async function createContract(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  if (!title || !content) return { error: 'Título e conteúdo são obrigatórios' };

  const id = randomUUID();
  await db.prepare(`
    INSERT INTO societario_contracts (id, title, content, created_by_user_id)
    VALUES (?, ?, ?, ?)
  `).run(id, title, content, session.user_id);

  revalidatePath('/admin/societario/contratos');
  return { success: true, id };
}

export async function getContracts() {
  const session = await getSession();
  if (!session) return [];
  return await db.prepare(`
    SELECT sc.*, u.name as author_name
    FROM societario_contracts sc
    LEFT JOIN users u ON u.id = sc.created_by_user_id
    ORDER BY sc.updated_at DESC
  `).all();
}
