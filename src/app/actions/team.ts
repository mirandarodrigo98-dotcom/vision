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
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  cpf?: string;
  phone?: string;
  department_id?: string;
  department_name?: string;
  access_schedule_id?: string | null;
  access_schedule_name?: string | null;
  restricted_companies?: string[];
};

export async function getTeamUsers() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  const users = await db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.is_active, u.last_login_at, u.created_at, u.cpf, u.phone, u.department_id, d.name as department_name, u.access_schedule_id, s.name as access_schedule_name,
    (SELECT GROUP_CONCAT(urc.company_id) FROM user_restricted_companies urc WHERE urc.user_id = u.id) as restricted_company_ids
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    LEFT JOIN access_schedules s ON u.access_schedule_id = s.id
    WHERE u.role IN ('admin', 'operator') AND u.deleted_at IS NULL
    ORDER BY u.name ASC
  `).all() as (TeamUser & { restricted_company_ids: string | null })[];

  return users.map(u => ({
    ...u,
    restricted_companies: u.restricted_company_ids ? u.restricted_company_ids.split(',') : []
  }));
}

export async function createTeamUser(data: { name: string; email: string; role: 'admin' | 'operator'; cpf?: string; phone?: string; department_id?: string; access_schedule_id?: string; restricted_company_ids?: string[] }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Não autorizado' };
  }

  const { name, email, role, cpf, phone, department_id, access_schedule_id, restricted_company_ids } = data;

  // Validate email unique
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return { error: 'E-mail já cadastrado.' };
  }

  // Validate CPF unique if provided
  if (cpf) {
    const existingCpf = await db.prepare('SELECT id FROM users WHERE cpf = ?').get(cpf);
    if (existingCpf) {
      return { error: 'CPF já cadastrado.' };
    }
  }

  const id = uuidv4();

  // Generate random password (8 chars alphanumeric)
  const password = crypto.randomBytes(4).toString('hex');
  const hash = await hashPassword(password);

  try {
    await db.prepare(`
      INSERT INTO users (id, name, email, role, is_active, password_hash, password_temporary, cpf, phone, department_id, access_schedule_id)
      VALUES (?, ?, ?, ?, 1, ?, 1, ?, ?, ?, ?)
    `).run(id, name, email, role, hash, cpf || null, phone || null, department_id || null, access_schedule_id || null);

    if (restricted_company_ids && restricted_company_ids.length > 0) {
      const insertRestriction = db.prepare('INSERT INTO user_restricted_companies (user_id, company_id) VALUES (?, ?)');
      for (const companyId of restricted_company_ids) {
        await insertRestriction.run(id, companyId);
      }
    }

    // Send email with password
    await sendEmail({
        to: email,
        subject: 'Seja Bem-Vindo à VISION',
        html: `
            <div style="font-family: Arial, sans-serif; text-align: center;">
                <p>Você está recebendo sua senha de acesso a Vision. Será necessário alterar no primeiro acesso.</p>
                <br />
                <p><strong>Usuário:</strong> ${email}</p>
                <p><strong>Senha:</strong> ${password}</p>
                <br />
                <p><a href="https://vision.nzdcontabilidade.com.br/login">Acessar Sistema</a></p>
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

export async function updateTeamUser(id: string, data: { name: string; email: string; role: 'admin' | 'operator'; cpf?: string; phone?: string; department_id?: string; access_schedule_id?: string; restricted_company_ids?: string[] }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Não autorizado' };
  }

  const { name, email, role, cpf, phone, department_id, access_schedule_id, restricted_company_ids } = data;

  // Validate email unique (excluding current user)
  const existing = await db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
  if (existing) {
    return { error: 'E-mail já cadastrado.' };
  }

  // Validate CPF unique if provided
  if (cpf) {
    const existingCpf = await db.prepare('SELECT id FROM users WHERE cpf = ? AND id != ?').get(cpf, id);
    if (existingCpf) {
      return { error: 'CPF já cadastrado.' };
    }
  }

  try {
    await db.prepare(`
      UPDATE users 
      SET name = ?, email = ?, role = ?, cpf = ?, phone = ?, department_id = ?, access_schedule_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, email, role, cpf || null, phone || null, department_id || null, access_schedule_id || null, id);

    // Update restrictions
    await db.prepare('DELETE FROM user_restricted_companies WHERE user_id = ?').run(id);
    if (restricted_company_ids && restricted_company_ids.length > 0) {
      const insertRestriction = db.prepare('INSERT INTO user_restricted_companies (user_id, company_id) VALUES (?, ?)');
      for (const companyId of restricted_company_ids) {
        await insertRestriction.run(id, companyId);
      }
    }

    logAudit({
      action: 'UPDATE_TEAM_USER',
      actor_user_id: session.user_id,
      actor_email: session.email,
      role: session.role,
      entity_type: 'user',
      entity_id: id,
      success: true,
      metadata: { updated_role: role, updated_email: email }
    });

    revalidatePath('/admin/team');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: 'Erro ao atualizar usuário.' };
  }
}

export async function toggleTeamUserStatus(userId: string, currentStatus: boolean) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Não autorizado' };
  }

  // Prevent self-deactivation (optional but good practice)
  if (userId === session.user_id) {
      return { error: 'Você não pode desativar seu próprio usuário.' };
  }

  const newStatus = !currentStatus;

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
                    <p>Você está recebendo sua senha de acesso a Vision. Será necessário alterar no primeiro acesso.</p>
                    <br />
                    <p><strong>Usuário:</strong> ${user.email}</p>
                    <p><strong>Senha:</strong> ${password}</p>
                <br />
                <p><a href="https://vision.nzdcontabilidade.com.br/login">Acessar Sistema</a></p>
            </div>
            `,
            category: 'welcome_email'
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
