'use server'

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';

export type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operator';
  is_active: number;
  last_login_at: string | null;
  created_at: string;
};

export async function getTeamUsers() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  const users = await db.prepare(`
    SELECT id, name, email, role, is_active, last_login_at, created_at
    FROM users 
    WHERE role IN ('admin', 'operator') AND deleted_at IS NULL
    ORDER BY name ASC
  `).all() as TeamUser[];

  return users;
}

export async function createTeamUser(data: { name: string; email: string; role: 'admin' | 'operator' }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Não autorizado' };
  }

  const { name, email, role } = data;

  // Validate email unique
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return { error: 'E-mail já cadastrado.' };
  }

  const id = uuidv4();

  try {
    await db.prepare(`
      INSERT INTO users (id, name, email, role, is_active)
      VALUES (?, ?, ?, ?, 1)
    `).run(id, name, email, role);

    logAudit({
      action: 'CREATE_TEAM_USER',
      actor_user_id: session.user_id,
      actor_email: session.email,
      role: session.role,
      entity_type: 'user',
      entity_id: id,
      success: true,
      metadata: { created_role: role, created_email: email }
    });

    revalidatePath('/admin/team');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: 'Erro ao criar usuário.' };
  }
}

export async function toggleTeamUserStatus(userId: string, currentStatus: number) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Não autorizado' };
  }

  // Prevent self-deactivation (optional but good practice)
  if (userId === session.user_id) {
      return { error: 'Você não pode desativar seu próprio usuário.' };
  }

  const newStatus = currentStatus === 1 ? 0 : 1;

  try {
    await db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, userId);

    logAudit({
      action: 'UPDATE_TEAM_USER_STATUS',
      actor_user_id: session.user_id,
      actor_email: session.email,
      role: session.role,
      entity_type: 'user',
      entity_id: userId,
      success: true,
      metadata: { new_status: newStatus }
    });

    revalidatePath('/admin/team');
    return { success: true };
  } catch (error) {
    return { error: 'Erro ao atualizar status.' };
  }
}

export async function deleteTeamUser(userId: string) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return { error: 'Não autorizado' };
    }
  
    if (userId === session.user_id) {
        return { error: 'Você não pode excluir seu próprio usuário.' };
    }
  
    try {
      // Soft delete
      await db.prepare("UPDATE users SET deleted_at = CURRENT_TIMESTAMP, is_active = 0 WHERE id = ?").run(userId);
  
      logAudit({
        action: 'DELETE_TEAM_USER',
        actor_user_id: session.user_id,
        actor_email: session.email,
        role: session.role,
        entity_type: 'user',
        entity_id: userId,
        success: true
      });
  
      revalidatePath('/admin/team');
      return { success: true };
    } catch (error) {
      return { error: 'Erro ao excluir usuário.' };
    }
  }