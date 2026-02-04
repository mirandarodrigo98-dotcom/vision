'use server'

import db from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { sendEmail } from '@/lib/email/resend';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

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

  // Generate random password (8 chars alphanumeric)
  const password = crypto.randomBytes(4).toString('hex');
  const hash = await hashPassword(password);

  try {
    await db.prepare(`
      INSERT INTO users (id, name, email, role, is_active, password_hash, password_temporary)
      VALUES (?, ?, ?, ?, 1, ?, 1)
    `).run(id, name, email, role, hash);

    // Send email with password
    await sendEmail({
        to: email,
        subject: 'Seja Bem-Vindo à VISION',
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center;">
                <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/logo.svg" alt="Vision Logo" style="max-width: 150px; margin-bottom: 20px;" />
                <p>Você está recebendo sua senha de acesso a Vision. Será necessário alterar no primeiro acesso.</p>
                <br />
                <p><strong>Usuário:</strong> ${email}</p>
                <p><strong>Senha:</strong> ${password}</p>
                <br />
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login">Acessar Sistema</a></p>
            </div>
        `,
        category: 'welcome_email'
    });

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

export async function generateTempPassword(userId: string) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { error: 'Unauthorized' };
    }

    try {
        const user = await db.prepare('SELECT email, name FROM users WHERE id = ?').get(userId) as { email: string, name: string };
        if (!user) return { error: 'Usuário não encontrado' };

        const password = crypto.randomBytes(4).toString('hex'); // 8 chars
        const hash = await hashPassword(password);

        // Valid for 1 hour (Postgres syntax via converter)
        await db.prepare(`
            UPDATE users 
            SET password_hash = ?, password_temporary = 1, temp_password_expires_at = datetime('now', '+1 hour'), updated_at = datetime('now')
            WHERE id = ?
        `).run(hash, userId);

        logAudit({
            action: 'GENERATE_TEMP_PASSWORD',
            actor_user_id: session.user_id,
            actor_email: session.email,
            role: 'admin',
            entity_type: 'user',
            entity_id: userId,
            metadata: { email: user.email },
            success: true
        });

        return { success: true, password };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function sendPassword(userId: string) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { error: 'Unauthorized' };
    }

    try {
        const user = await db.prepare('SELECT email, name FROM users WHERE id = ?').get(userId) as { email: string, name: string };
        if (!user) return { error: 'Usuário não encontrado' };

        const password = crypto.randomBytes(4).toString('hex'); // 8 chars
        const hash = await hashPassword(password);

        await db.prepare(`
            UPDATE users 
            SET password_hash = ?, password_temporary = 1, updated_at = datetime('now')
            WHERE id = ?
        `).run(hash, userId);

        await sendEmail({
            to: user.email,
            subject: 'Seja Bem-Vindo à VISION',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center;">
                    <img src="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/logo.svg" alt="Vision Logo" style="max-width: 150px; margin-bottom: 20px;" />
                    <p>Você está recebendo sua senha de acesso a Vision. Será necessário alterar no primeiro acesso.</p>
                    <br />
                    <p><strong>Usuário:</strong> ${user.email}</p>
                    <p><strong>Senha:</strong> ${password}</p>
                    <br />
                    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login">Acessar Sistema</a></p>
                </div>
            `,
            category: 'password_reset'
        });

        logAudit({
            action: 'SEND_PASSWORD',
            actor_user_id: session.user_id,
            actor_email: session.email,
            role: 'admin',
            entity_type: 'user',
            entity_id: userId,
            metadata: { email: user.email },
            success: true
        });

        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}
