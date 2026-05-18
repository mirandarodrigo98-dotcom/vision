'use server';

import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { logAudit } from '@/lib/audit';
import { buildQuestorZenCredentialChanges, normalizeQuestorZenSnapshot } from '@/lib/questor-zen-audit';

export async function updateProfile(formData: FormData) {
    const session = await getSession();
    if (!session) {
        return { error: 'Não autorizado' };
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const questorZenUsuario = formData.get('questor_zen_usuario') as string;
    const questorZenSenha = formData.get('questor_zen_senha') as string;
    const questorZenToken = formData.get('questor_zen_token') as string;
    const currentPassword = formData.get('current_password') as string;
    const newPassword = formData.get('new_password') as string;
    const confirmPassword = formData.get('confirm_password') as string;
    const avatarFile = formData.get('avatar') as File;

    if (!name || !email) {
        return { error: 'Nome e Email são obrigatórios.' };
    }

    try {
        
        const user = (await db.query(`
            SELECT password_hash, avatar_path, questor_zen_usuario, questor_zen_senha, questor_zen_token
            FROM users
            WHERE id = $1
        `, [session.user_id])).rows[0] as {
            password_hash: string,
            avatar_path: string | null,
            questor_zen_usuario: string | null,
            questor_zen_senha: string | null,
            questor_zen_token: string | null
        };

        if (!user) {
            return { error: 'Usuário não encontrado.' };
        }

        let avatarPath = user.avatar_path;
        const previousQuestorZenData = normalizeQuestorZenSnapshot({
            questor_zen_usuario: user.questor_zen_usuario,
            questor_zen_senha: user.questor_zen_senha,
            questor_zen_token: user.questor_zen_token,
        });
        const nextQuestorZenData = normalizeQuestorZenSnapshot({
            questor_zen_usuario: questorZenUsuario,
            questor_zen_senha: questorZenSenha,
            questor_zen_token: questorZenToken,
        });

        if (avatarFile && avatarFile.size > 0) {
            const buffer = Buffer.from(await avatarFile.arrayBuffer());
            const ext = avatarFile.name.split('.').pop();
            const filename = `${randomUUID()}.${ext}`;
            const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
            const filePath = join(uploadDir, filename);
            
            await writeFile(filePath, buffer);
            avatarPath = `/uploads/avatars/${filename}`;
        }

        // If changing password
        if (newPassword) {
            if (!currentPassword) {
                return { error: 'Senha atual é obrigatória para definir uma nova senha.' };
            }

            const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!validPassword) {
                return { error: 'Senha atual incorreta.' };
            }

            if (newPassword !== confirmPassword) {
                return { error: 'A nova senha e a confirmação não coincidem.' };
            }

            if (newPassword.length < 6) {
                return { error: 'A nova senha deve ter pelo menos 6 caracteres.' };
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            await db.query(`
                UPDATE users 
                SET name = $1, email = $2, phone = $3, avatar_path = $4, password_hash = $5,
                    questor_zen_usuario = $6, questor_zen_senha = $7, questor_zen_token = $8, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $9
            `, [
                name,
                email,
                phone,
                avatarPath,
                hashedPassword,
                nextQuestorZenData.questor_zen_usuario,
                nextQuestorZenData.questor_zen_senha,
                nextQuestorZenData.questor_zen_token,
                session.user_id
            ]);

        } else {
            // Updating info only
            await db.query(`
                UPDATE users 
                SET name = $1, email = $2, phone = $3, avatar_path = $4,
                    questor_zen_usuario = $5, questor_zen_senha = $6, questor_zen_token = $7, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $8
            `, [
                name,
                email,
                phone,
                avatarPath,
                nextQuestorZenData.questor_zen_usuario,
                nextQuestorZenData.questor_zen_senha,
                nextQuestorZenData.questor_zen_token,
                session.user_id
            ]);
        }

        const questorZenChanges = buildQuestorZenCredentialChanges(previousQuestorZenData, nextQuestorZenData);
        if (questorZenChanges.length > 0) {
            await logAudit({
                action: 'UPDATE_USER',
                actor_user_id: session.user_id,
                actor_email: session.email,
                role: session.role,
                entity_type: 'user',
                entity_id: session.user_id,
                success: true,
                metadata: {
                    scope: 'questor_zen_credentials',
                    source: 'client_user_profile',
                    target_email: email,
                    changes: questorZenChanges,
                }
            });
        }

        revalidatePath('/admin', 'layout');
        revalidatePath('/admin/client-users');
        revalidatePath('/admin/profile');
        revalidatePath('/app/profile');
        return { success: 'Perfil atualizado com sucesso!' };
    } catch (error) {
        console.error('Error updating profile:', error);
        return { error: 'Erro ao atualizar perfil.' };
    }
}
