'use server';

import db from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { getSession, hashPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/email/resend';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function createClientUser(data: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const name = data.get('name') as string;
  const email = data.get('email') as string;
  const phone = data.get('phone') as string;
  // Get all company_ids
  const company_ids = data.getAll('company_ids') as string[];

  if (!name || !email || company_ids.length === 0) {
    return { error: 'Nome, Email e pelo menos uma Empresa são obrigatórios.' };
  }

  try {
    const userId = uuidv4();
    
    // Transação para criar user e vínculo
    const tx = await db.transaction(async () => {
      await db.prepare(`
        INSERT INTO users (id, name, email, phone, role, is_active)
        VALUES (?, ?, ?, ?, 'client_user', 1)
      `).run(userId, name, email, phone);

      const insertCompany = db.prepare(`
        INSERT INTO user_companies (user_id, company_id)
        VALUES (?, ?)
      `);
      
      for (const cid of company_ids) {
          await insertCompany.run(userId, cid);
      }
    });
    
    await tx();

    logAudit({
      action: 'CREATE_USER',
      actor_user_id: session.user_id,
      actor_email: session.email,
      role: 'admin',
      entity_type: 'user',
      entity_id: userId,
      metadata: { name, email, company_ids },
      success: true
    });

    revalidatePath('/admin/client-users');
    return { success: true };
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { error: 'Email já cadastrado.' };
    }
    return { error: 'Erro ao criar usuário: ' + error.message };
  }
}

export async function updateClientUser(id: string, data: FormData) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const name = data.get('name') as string;
  const email = data.get('email') as string;
  const phone = data.get('phone') as string;
  const company_ids = data.getAll('company_ids') as string[];

  if (company_ids.length === 0) {
      return { error: 'Selecione pelo menos uma empresa.' };
  }

  try {
    const tx = await db.transaction(async () => {
        await db.prepare(`
            UPDATE users 
            SET name = ?, email = ?, phone = ?, updated_at = datetime('now', '-03:00')
            WHERE id = ?
        `).run(name, email, phone, id);

        await db.prepare('DELETE FROM user_companies WHERE user_id = ?').run(id);
        
        const insertCompany = db.prepare('INSERT INTO user_companies (user_id, company_id) VALUES (?, ?)');
        for (const cid of company_ids) {
            await insertCompany.run(id, cid);
        }
    });

    await tx();

    logAudit({
      action: 'UPDATE_USER',
      actor_user_id: session.user_id,
      actor_email: session.email,
      role: 'admin',
      entity_type: 'user',
      entity_id: id,
      metadata: { name, email, company_ids },
      success: true
    });

    revalidatePath('/admin/client-users');
    return { success: true };
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { error: 'Email já cadastrado.' };
    }
    return { error: 'Erro ao atualizar usuário.' };
  }
}

export async function toggleUserStatus(id: string, isActive: boolean) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  await db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(isActive ? 1 : 0, id);
  
  revalidatePath('/admin/client-users');
  return { success: true };
}

export async function sendPassword(userId: string) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { error: 'Unauthorized' };
    }

    try {
        const user = await db.prepare('SELECT email, name FROM users WHERE id = ?').get(userId) as { email: string, name: string };
        if (!user) return { error: 'Usuário não encontrado' };

        const password = crypto.randomBytes(6).toString('hex'); // 12 chars
        const hash = await hashPassword(password);

        await db.prepare(`
            UPDATE users 
            SET password_hash = ?, password_temporary = 1, updated_at = datetime('now')
            WHERE id = ?
        `).run(hash, userId);

        await sendEmail({
            to: user.email,
            subject: 'Sua Senha de Acesso - NZD Contabilidade',
            html: `
                <p>Olá ${user.name},</p>
                <p>Sua conta foi configurada. Use a senha temporária abaixo para acessar o sistema:</p>
                <h3>${password}</h3>
                <p>Você deverá alterar sua senha após o login.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login">Acessar Sistema</a></p>
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
