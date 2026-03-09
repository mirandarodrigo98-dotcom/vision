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

// Validate email for Step 2 of Wizard
export async function validateUserEmail(email: string, currentUserId?: string) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
        return { error: 'Unauthorized' };
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'Email inválido.' };
    }

    let query = 'SELECT id, name FROM users WHERE email = ?';
    const params = [email];

    if (currentUserId) {
        query += ' AND id != ?';
        params.push(currentUserId);
    }

    const existing = await db.prepare(query).get(...params) as { id: string, name: string } | undefined;

    if (existing) {
        return { error: 'Email já está em uso.', existingUser: existing };
    }

    return { success: true };
}

interface SaveClientUserPayload {
    id?: string;
    name: string;
    email: string;
    cell_phone?: string;
    notification_email: boolean;
    notification_whatsapp: boolean;
    company_ids: string[];
    permissions: string[];
}

export async function getClientUserPermissions(userId: string) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
        return [];
    }

    try {
        const permissions = await db.prepare('SELECT permission_code FROM user_permissions WHERE user_id = ?').all(userId) as { permission_code: string }[];
        return permissions.map(p => p.permission_code);
    } catch (error) {
        console.error('Error fetching client user permissions:', error);
        return [];
    }
}

export async function saveClientUser(data: SaveClientUserPayload) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Unauthorized' };
  }

  const { id, name, email, cell_phone, notification_email, notification_whatsapp, company_ids, permissions } = data;

  if (!name || !email || company_ids.length === 0) {
    return { error: 'Nome, email e pelo menos uma empresa são obrigatórios.' };
  }

  // Double check email uniqueness
  const emailCheck = await validateUserEmail(email, id);
  if (emailCheck.error) {
      return { error: emailCheck.error };
  }

  try {
    const transaction = db.transaction(async () => {
        let userId = id;

        if (userId) {
            // Update
            await db.prepare(`
                UPDATE users 
                SET name = ?, email = ?, cell_phone = ?, notification_email = ?, notification_whatsapp = ?, updated_at = NOW()
                WHERE id = ?
            `).run(name, email, cell_phone || null, notification_email ? 1 : 0, notification_whatsapp ? 1 : 0, userId);

            // Clear existing relations
            await db.prepare('DELETE FROM user_companies WHERE user_id = ?').run(userId);
            await db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(userId);

        } else {
            // Create
            userId = uuidv4();
            const tempPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await hashPassword(tempPassword);

            await db.prepare(`
                INSERT INTO users (id, name, email, cell_phone, notification_email, notification_whatsapp, role, is_active, password_hash, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'client_user', 1, ?, NOW())
            `).run(userId, name, email, cell_phone || null, notification_email ? 1 : 0, notification_whatsapp ? 1 : 0, hashedPassword);

            // Send welcome email
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
        }

        // Insert Companies
        const insertCompany = db.prepare('INSERT INTO user_companies (user_id, company_id) VALUES (?, ?)');
        for (const companyId of company_ids) {
            await insertCompany.run(userId, companyId);
        }

        // Set active company if needed (for new users or if active company was removed)
        if (company_ids.length > 0) {
            // Check if current active company is still valid
            const currentActive = await db.prepare('SELECT active_company_id FROM users WHERE id = ?').get(userId) as { active_company_id: string };
            if (!currentActive?.active_company_id || !company_ids.includes(currentActive.active_company_id)) {
                 await db.prepare('UPDATE users SET active_company_id = ? WHERE id = ?').run(company_ids[0], userId);
            }
        }

        // Insert Permissions
        const insertPermission = db.prepare('INSERT INTO user_permissions (user_id, permission_code) VALUES (?, ?)');
        for (const perm of permissions) {
            await insertPermission.run(userId, perm);
        }
    });

    await transaction();
    revalidatePath('/admin/client-users');
    return { success: true };

  } catch (error: any) {
      console.error('Error saving client user:', error);
      return { error: 'Erro ao salvar usuário: ' + error.message };
  }
}

export async function toggleUserStatus(userId: string, currentStatus: number) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    return { error: 'Unauthorized' };
  }

  try {
    await db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(currentStatus === 1 ? 0 : 1, userId);
    revalidatePath('/admin/client-users');
    return { success: true };
  } catch (e) {
    return { error: 'Erro ao alterar status.' };
  }
}

export async function sendPassword(userId: string) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
        return { error: 'Unauthorized' };
    }

    try {
        const user = await db.prepare('SELECT name, email FROM users WHERE id = ?').get(userId) as { name: string, email: string };
        if (!user) return { error: 'Usuário não encontrado.' };

        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await hashPassword(tempPassword);

        await db.prepare('UPDATE users SET password_hash = ?, password_temporary = 1 WHERE id = ?').run(hashedPassword, userId);

        await sendEmail({
            to: user.email,
            subject: 'Redefinição de Senha - VISION',
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h2>Redefinição de Senha</h2>
                    <p>Olá ${user.name},</p>
                    <p>Sua senha foi redefinida pelo administrador.</p>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p style="margin: 5px 0;"><strong>Nova Senha Provisória:</strong> ${tempPassword}</p>
                    </div>
                    <p>Recomendamos que altere sua senha após o acesso.</p>
                </div>
            `,
            category: 'password_reset'
        });

        return { success: true };
    } catch (e) {
        return { error: 'Erro ao enviar senha.' };
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

        await db.prepare('UPDATE users SET password_hash = ?, password_temporary = 1 WHERE id = ?').run(hashedPassword, userId);

        return { success: true, password: tempPassword };
    } catch (e) {
        return { error: 'Erro ao gerar senha.' };
    }
}
