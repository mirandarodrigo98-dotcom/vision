'use server';

import db from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email/resend';
import { v4 as uuidv4 } from 'uuid';

export async function getUserCompanies() {
  const session = await getSession();
  if (!session) return [];

  const companies = await db.prepare(`
    SELECT c.id, c.razao_social, c.cnpj
    FROM client_companies c
    JOIN user_companies uc ON c.id = uc.company_id
    WHERE uc.user_id = ? AND c.is_active = 1
    ORDER BY c.razao_social
  `).all(session.user_id) as any[];

  return companies;
}

export async function switchCompany(companyId: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  // Verify if user is linked to this company
  const link = await db.prepare(`
    SELECT 1 FROM user_companies 
    WHERE user_id = ? AND company_id = ?
  `).get(session.user_id, companyId);

  if (!link) {
    throw new Error('User not linked to this company');
  }

  // Update active company
  await db.prepare(`
    UPDATE users SET active_company_id = ? WHERE id = ?
  `).run(companyId, session.user_id);

  revalidatePath('/app');
  return { success: true };
}

export async function createClientUser(formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const companyIds = formData.getAll('company_ids') as string[];

  if (!name || !email || companyIds.length === 0) {
    return { error: 'Nome, email e pelo menos uma empresa são obrigatórios.' };
  }

  // Check if email exists
  const existing = await db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
  if (existing) {
    return { error: 'Email já está em uso.' };
  }

  const tempPassword = Math.random().toString(36).slice(-8);
  const hashedPassword = await hashPassword(tempPassword);
  const userId = uuidv4();

  try {
    const createUser = db.transaction(async () => {
      // Create user
      await db.prepare(`
        INSERT INTO users (id, name, email, phone, password_hash, role, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, 'client_user', 1, NOW())
      `).run(userId, name, email, phone, hashedPassword);

      // Link companies
      for (const companyId of companyIds) {
        await db.prepare(`
          INSERT INTO user_companies (user_id, company_id)
          VALUES (?, ?)
        `).run(userId, companyId);
      }

      // Set first company as active
      if (companyIds.length > 0) {
        await db.prepare('UPDATE users SET active_company_id = ? WHERE id = ?').run(companyIds[0], userId);
      }
    });

    await createUser();

    // Send email
    await sendEmail({
      to: email,
      subject: 'Bem-vindo ao VISION',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Bem-vindo ao VISION</h2>
          <p>Olá ${name},</p>
          <p>Sua conta de acesso foi criada com sucesso.</p>
          <p>Para acessar o sistema, utilize as credenciais abaixo:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Senha Provisória:</strong> ${tempPassword}</p>
          </div>
          <p>Recomendamos que altere sua senha após o primeiro acesso.</p>
          <p>Atenciosamente,<br>Equipe NZD</p>
        </div>
      `,
      category: 'user_created'
    });

    revalidatePath('/admin/client-users');
    return { success: true };
  } catch (e: any) {
    console.error(e);
    return { error: 'Erro ao criar usuário: ' + e.message };
  }
}

export async function updateClientUser(userId: string, formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const companyIds = formData.getAll('company_ids') as string[];

  if (!name || !email || companyIds.length === 0) {
    return { error: 'Nome, email e pelo menos uma empresa são obrigatórios.' };
  }

  // Check if email exists for other user
  const existing = await db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId);
  if (existing) {
    return { error: 'Email já está em uso por outro usuário.' };
  }

  try {
    const updateUser = db.transaction(async () => {
      // Update user details
      await db.prepare(`
        UPDATE users 
        SET name = ?, email = ?, phone = ?, updated_at = NOW()
        WHERE id = ?
      `).run(name, email, phone, userId);

      // Update companies links
      // First delete all
      await db.prepare('DELETE FROM user_companies WHERE user_id = ?').run(userId);

      // Then re-insert
      for (const companyId of companyIds) {
        await db.prepare(`
          INSERT INTO user_companies (user_id, company_id)
          VALUES (?, ?)
        `).run(userId, companyId);
      }

      // Check active company
      const activeCompanyCheck = await db.prepare(`
        SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = (SELECT active_company_id FROM users WHERE id = ?)
      `).get(userId, userId);

      if (!activeCompanyCheck && companyIds.length > 0) {
        // If active company is no longer linked, set to first one
        await db.prepare('UPDATE users SET active_company_id = ? WHERE id = ?').run(companyIds[0], userId);
      }
    });

    await updateUser();

    revalidatePath('/admin/client-users');
    return { success: true };
  } catch (e: any) {
    console.error(e);
    return { error: 'Erro ao atualizar usuário: ' + e.message };
  }
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Unauthorized' };
  }

  try {
    await db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, userId);
    revalidatePath('/admin/client-users');
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function sendPassword(userId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Unauthorized' };
  }

  try {
    const user = await db.prepare('SELECT name, email FROM users WHERE id = ?').get(userId) as any;
    if (!user) return { error: 'Usuário não encontrado' };

    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await hashPassword(newPassword);

    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashedPassword, userId);

    await sendEmail({
      to: user.email,
      subject: 'Nova Senha de Acesso - VISION',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Redefinição de Senha</h2>
          <p>Olá ${user.name},</p>
          <p>Uma nova senha foi gerada para seu acesso ao VISION.</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Nova Senha:</strong> ${newPassword}</p>
          </div>
          <p>Recomendamos que altere sua senha após o acesso.</p>
        </div>
      `,
      category: 'password_reset'
    });

    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function generateTempPassword(userId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Unauthorized' };
  }

  try {
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await hashPassword(tempPassword);

    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashedPassword, userId);

    return { success: true, password: tempPassword };
  } catch (e: any) {
    return { error: e.message };
  }
}
