'use server';

import db from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email/resend';
import { v4 as uuidv4 } from 'uuid';

async function checkOperatorAccessToUser(operatorId: string, targetUserId: string) {
    // Check if target user has any company that is restricted for the operator
    const conflict = (await db.query(`
        SELECT 1 
        FROM user_companies uc
        JOIN user_restricted_companies urc ON urc.company_id = uc.company_id
        WHERE uc.user_id = $1 AND urc.user_id = $2
    `, [targetUserId, operatorId])).rows[0];
    
    return !conflict;
}

export async function getUserCompanies() {
  const session = await getSession();
  if (!session) return [];

  if (session.role === 'client_user') {
      const companies = (await db.query(`
        SELECT c.id, c.razao_social, c.cnpj
        FROM client_companies c
        JOIN user_companies uc ON c.id = uc.company_id
        WHERE uc.user_id = $1 AND c.is_active = 1
        ORDER BY c.razao_social
      `, [session.user_id])).rows as any[];
      return companies;
  } else if (session.role === 'operator') {
      const companies = (await db.query(`
        SELECT c.id, c.razao_social, c.cnpj
        FROM client_companies c
        WHERE c.is_active = 1 
        AND (c.id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1))
        ORDER BY c.razao_social
      `, [session.user_id])).rows as any[];
      return companies;
  } else if (session.role === 'admin') {
      const companies = (await db.query(`
        SELECT c.id, c.razao_social, c.cnpj
        FROM client_companies c
        WHERE c.is_active = 1
        ORDER BY c.razao_social
      `, [])).rows as any[];
      return companies;
  }
  return [];
}

export async function switchCompany(companyId: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');

  // Verify permission based on role
  let hasAccess = false;

  if (session.role === 'client_user') {
    const link = (await db.query(`
      SELECT 1 FROM user_companies 
      WHERE user_id = $1 AND company_id = $2
    `, [session.user_id, companyId])).rows[0];
    hasAccess = !!link;
  } else if (session.role === 'operator') {
    // Operators have access to all EXCEPT restricted ones
    const restricted = (await db.query(`
      SELECT 1 FROM user_restricted_companies 
      WHERE user_id = $1 AND company_id = $2
    `, [session.user_id, companyId])).rows[0];
    hasAccess = !restricted;
  } else if (session.role === 'admin') {
    hasAccess = true;
  }

  if (!hasAccess) {
    throw new Error('User not authorized for this company');
  }

  // Update active company
  await db.query(`
    UPDATE users SET active_company_id = $1 WHERE id = $2
  `, [companyId, session.user_id]);

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

    let query = `SELECT id, name FROM users WHERE email = $1`;
    const params = [email];

    if (currentUserId) {
        query += ' AND id != ?';
        params.push(currentUserId);
    }

    const existing = (await db.query(query, [...params])).rows[0] as { id: string, name: string } | undefined;

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
        const permissions = (await db.query(`SELECT permission_code FROM user_permissions WHERE user_id = $1`, [userId])).rows as { permission_code: string }[];
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

  if (session.role === 'operator' && company_ids.length > 0) {
      const placeholders = company_ids.map(() => '?').join(',');
      const restricted = (await db.query(`
          SELECT company_id FROM user_restricted_companies 
          WHERE user_id = $1 AND company_id IN (${placeholders})
      `, [session.user_id, ...company_ids])).rows as { company_id: string }[];
      
      if (restricted.length > 0) {
          return { error: 'Você não tem permissão para conceder acesso a uma ou mais empresas selecionadas.' };
      }
  }

  if (id && session.role === 'operator') {
      const hasAccess = await checkOperatorAccessToUser(session.user_id, id);
      if (!hasAccess) {
          return { error: 'Você não tem permissão para editar este usuário.' };
      }
  }

  try {
    const transaction = db.transaction(async () => {
        let userId = id;

        if (userId) {
            // Update
            await db.query(`
                UPDATE users 
                SET name = $1, email = $2, cell_phone = $3, notification_email = $4, notification_whatsapp = $5, updated_at = NOW()
                WHERE id = $6
            `, [name, email, cell_phone || null, notification_email ? 1 : 0, notification_whatsapp ? 1 : 0, userId]);

            // Clear existing relations
            await db.query(`DELETE FROM user_companies WHERE user_id = $1`, [userId]);
            await db.query(`DELETE FROM user_permissions WHERE user_id = $1`, [userId]);

        } else {
            // Create
            userId = uuidv4();
            const tempPassword = Math.random().toString(36).slice(-8);
            const hashedPassword = await hashPassword(tempPassword);

            await db.query(`
                INSERT INTO users (id, name, email, cell_phone, notification_email, notification_whatsapp, role, is_active, password_hash, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'client_user', 1, $7, NOW())
            `, [userId, name, email, cell_phone || null, notification_email ? 1 : 0, notification_whatsapp ? 1 : 0, hashedPassword]);

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
                    <p><a href="https://vision.nzdcontabilidade.com.br/login">Acessar Sistema</a></p>
                    <p>Recomendamos que altere sua senha após o primeiro acesso.</p>
                    <p>Atenciosamente,<br>Equipe NZD</p>
                  </div>
                `,
                category: 'user_created'
              });
        }

        // Insert Companies
        
        for (const companyId of company_ids) {
            await db.query(`INSERT INTO user_companies (user_id, company_id) VALUES ($1, $2)`, [userId, companyId]);
        }

        // Set active company if needed (for new users or if active company was removed)
        if (company_ids.length > 0) {
            // Check if current active company is still valid
            const currentActive = (await db.query(`SELECT active_company_id FROM users WHERE id = $1`, [userId])).rows[0] as { active_company_id: string };
            if (!currentActive?.active_company_id || !company_ids.includes(currentActive.active_company_id)) {
                 await db.query(`UPDATE users SET active_company_id = $1 WHERE id = $2`, [company_ids[0], userId]);
            }
        }

        // Insert Permissions
        
        for (const perm of permissions) {
            await db.query(`INSERT INTO user_permissions (user_id, permission_code) VALUES ($1, $2)`, [userId, perm]);
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

  if (session.role === 'operator') {
      const hasAccess = await checkOperatorAccessToUser(session.user_id, userId);
      if (!hasAccess) {
          return { error: 'Você não tem permissão para gerenciar este usuário.' };
      }
  }

  try {
    await db.query(`UPDATE users SET is_active = $1 WHERE id = $2`, [currentStatus === 1 ? 0 : 1, userId]);
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

    if (session.role === 'operator') {
        const hasAccess = await checkOperatorAccessToUser(session.user_id, userId);
        if (!hasAccess) {
            return { error: 'Você não tem permissão para gerenciar este usuário.' };
        }
    }

    try {
        const user = (await db.query(`SELECT name, email FROM users WHERE id = $1`, [userId])).rows[0] as { name: string, email: string };
        if (!user) return { error: 'Usuário não encontrado.' };

        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await hashPassword(tempPassword);

        await db.query(`UPDATE users SET password_hash = $1, password_temporary = 1 WHERE id = $2`, [hashedPassword, userId]);

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
                    <p><a href="https://vision.nzdcontabilidade.com.br/login">Acessar Sistema</a></p>
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

    if (session.role === 'operator') {
        const hasAccess = await checkOperatorAccessToUser(session.user_id, userId);
        if (!hasAccess) {
            return { error: 'Você não tem permissão para gerenciar este usuário.' };
        }
    }

    try {
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await hashPassword(tempPassword);

        await db.query(`UPDATE users SET password_hash = $1, password_temporary = 1 WHERE id = $2`, [hashedPassword, userId]);

        return { success: true, password: tempPassword };
    } catch (e) {
        return { error: 'Erro ao gerar senha.' };
    }
}
