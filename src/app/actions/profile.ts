'use server';

import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcrypt';
import { revalidatePath } from 'next/cache';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function updateProfile(formData: FormData) {
    const session = await getSession();
    if (!session) {
        return { error: 'Não autorizado' };
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const currentPassword = formData.get('current_password') as string;
    const newPassword = formData.get('new_password') as string;
    const confirmPassword = formData.get('confirm_password') as string;
    const avatarFile = formData.get('avatar') as File;

    if (!name || !email) {
        return { error: 'Nome e Email são obrigatórios.' };
    }

    try {
        const getUser = db.prepare('SELECT password_hash, avatar_path FROM users WHERE id = ?');
        const user = await getUser.get(session.user_id) as { password_hash: string, avatar_path: string | null };

        if (!user) {
            return { error: 'Usuário não encontrado.' };
        }

        let avatarPath = user.avatar_path;

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
            
            await db.prepare(`
                UPDATE users 
                SET name = ?, email = ?, phone = ?, avatar_path = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `).run(name, email, phone, avatarPath, hashedPassword, session.user_id);

        } else {
            // Updating info only
            await db.prepare(`
                UPDATE users 
                SET name = ?, email = ?, phone = ?, avatar_path = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `).run(name, email, phone, avatarPath, session.user_id);
        }

        revalidatePath('/admin', 'layout');
        return { success: 'Perfil atualizado com sucesso!' };
    } catch (error) {
        console.error('Error updating profile:', error);
        return { error: 'Erro ao atualizar perfil.' };
    }
}