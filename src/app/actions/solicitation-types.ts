'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { ensureSolicitationsTables } from '@/lib/solicitations-db';

export interface SolicitationType {
  id: string;
  name: string;
  description: string | null;
  department_id: string;
  department_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function canManageSolicitationTypes(role?: string | null) {
  return role === 'admin' || role === 'operator';
}

export async function getSolicitationTypes(options?: { activeOnly?: boolean }) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    await ensureSolicitationsTables();

    let query = `
      SELECT
        st.*,
        d.name AS department_name
      FROM solicitation_types st
      JOIN departments d ON d.id = st.department_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (options?.activeOnly) {
      query += ` AND st.is_active = TRUE`;
    }

    query += ` ORDER BY st.name ASC`;

    const rows = (await db.query(query, params)).rows as Array<any>;
    return {
      data: rows.map((row) => ({
        ...row,
        is_active: Boolean(row.is_active),
      })) as SolicitationType[],
    };
  } catch (error) {
    console.error('Error fetching solicitation types:', error);
    return { error: 'Erro ao buscar tipos de solicitacao.' };
  }
}

export async function getSolicitationType(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    await ensureSolicitationsTables();

    const row = (await db.query(`
      SELECT
        st.*,
        d.name AS department_name
      FROM solicitation_types st
      JOIN departments d ON d.id = st.department_id
      WHERE st.id = $1
    `, [id])).rows[0] as any;

    if (!row) return { error: 'Tipo de solicitacao nao encontrado.' };

    return {
      data: {
        ...row,
        is_active: Boolean(row.is_active),
      } as SolicitationType,
    };
  } catch (error) {
    console.error('Error fetching solicitation type:', error);
    return { error: 'Erro ao buscar tipo de solicitacao.' };
  }
}

export async function createSolicitationType(data: {
  name: string;
  description?: string;
  department_id: string;
  is_active?: boolean;
}) {
  const session = await getSession();
  if (!session || !canManageSolicitationTypes(session.role)) {
    return { error: 'Unauthorized' };
  }

  try {
    await ensureSolicitationsTables();

    const name = String(data.name || '').trim();
    const description = String(data.description || '').trim();
    const departmentId = String(data.department_id || '').trim();

    if (!name || !departmentId) {
      return { error: 'Preencha os campos obrigatorios.' };
    }

    await db.query(`
      INSERT INTO solicitation_types (
        id,
        name,
        description,
        department_id,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      randomUUID(),
      name,
      description || null,
      departmentId,
      data.is_active !== false,
    ]);

    revalidatePath('/admin/registrations/solicitation-types');
    revalidatePath('/app/solicitations');
    return { success: true };
  } catch (error: any) {
    console.error('Error creating solicitation type:', error);
    if (String(error?.message || '').toLowerCase().includes('unique')) {
      return { error: 'Ja existe um tipo de solicitacao com esse nome.' };
    }
    return { error: 'Erro ao criar tipo de solicitacao.' };
  }
}

export async function updateSolicitationType(id: string, data: {
  name: string;
  description?: string;
  department_id: string;
  is_active?: boolean;
}) {
  const session = await getSession();
  if (!session || !canManageSolicitationTypes(session.role)) {
    return { error: 'Unauthorized' };
  }

  try {
    await ensureSolicitationsTables();

    const name = String(data.name || '').trim();
    const description = String(data.description || '').trim();
    const departmentId = String(data.department_id || '').trim();

    if (!name || !departmentId) {
      return { error: 'Preencha os campos obrigatorios.' };
    }

    await db.query(`
      UPDATE solicitation_types
      SET
        name = $1,
        description = $2,
        department_id = $3,
        is_active = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [
      name,
      description || null,
      departmentId,
      data.is_active !== false,
      id,
    ]);

    revalidatePath('/admin/registrations/solicitation-types');
    revalidatePath('/app/solicitations');
    revalidatePath('/admin/solicitations');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating solicitation type:', error);
    if (String(error?.message || '').toLowerCase().includes('unique')) {
      return { error: 'Ja existe um tipo de solicitacao com esse nome.' };
    }
    return { error: 'Erro ao atualizar tipo de solicitacao.' };
  }
}

export async function deleteSolicitationType(id: string) {
  const session = await getSession();
  if (!session || !canManageSolicitationTypes(session.role)) {
    return { error: 'Unauthorized' };
  }

  try {
    await ensureSolicitationsTables();

    const linkedSolicitations = (await db.query(`
      SELECT COUNT(*)::int AS count
      FROM solicitations
      WHERE request_type_id = $1
    `, [id])).rows[0] as { count: number };

    if (linkedSolicitations.count > 0) {
      return { error: 'Nao e possivel excluir um tipo ja utilizado em solicitacoes.' };
    }

    await db.query(`DELETE FROM solicitation_types WHERE id = $1`, [id]);

    revalidatePath('/admin/registrations/solicitation-types');
    revalidatePath('/app/solicitations');
    return { success: true };
  } catch (error) {
    console.error('Error deleting solicitation type:', error);
    return { error: 'Erro ao excluir tipo de solicitacao.' };
  }
}
