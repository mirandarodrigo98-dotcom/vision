'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { AVAILABLE_PERMISSIONS } from '@/lib/permissions-constants';

export async function getUserPermissions() {
    const session = await getSession();
    
    if (!session) {
        return [];
    }

    if (session.role === 'admin') {
        return AVAILABLE_PERMISSIONS.map(p => p.code);
    }

    try {
        if (session.role === 'client_user') {
            // Client users have permissions assigned directly to them
            const result = await db.prepare('SELECT permission_code FROM user_permissions WHERE user_id = ?').all(session.user_id) as { permission_code: string }[];
            return result.map(r => r.permission_code);
        } else if (session.role === 'operator') {
            // Operators inherit permissions from their department
            if (!session.department_id) return [];
            const result = await db.prepare('SELECT permission_code FROM department_permissions WHERE department_id = ?').all(session.department_id) as { permission_code: string }[];
            return result.map(r => r.permission_code);
        } else {
            // Fallback (should not happen for admin as it's handled above)
            return [];
        }
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        return [];
    }
}

export async function getRolePermissions(role: string) {
    const session = await getSession();
    // Allow any authenticated user to check their own role permissions, 
    // or admin to check any. 
    // Ideally this function is called with session.role, so checking session is enough.
    // The previous check `if (!session || session.role !== 'admin')` was too restrictive for client users needing to check their own perms.
    
    if (!session) {
        throw new Error('Unauthorized');
    }

    if (role === 'admin') {
        return AVAILABLE_PERMISSIONS.map(p => p.code);
    }

    try {
        const result = await db.prepare('SELECT permission FROM role_permissions WHERE role = ?').all(role) as { permission: string }[];
        return result.map(r => r.permission);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        return [];
    }
}

export async function updateRolePermissions(role: string, permissions: string[]) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { error: 'Unauthorized' };
    }

    try {
        const updateTransaction = await db.transaction(async () => {
            // Remove all existing permissions for the role
            await db.prepare('DELETE FROM role_permissions WHERE role = ?').run(role);
            
            // Insert new permissions
            const insert = db.prepare('INSERT INTO role_permissions (role, permission) VALUES (?, ?)');
            for (const perm of permissions) {
                await insert.run(role, perm);
            }
        });

        await updateTransaction();
        revalidatePath('/admin/permissions');
        return { success: true };
    } catch (error) {
        console.error('Error updating permissions:', error);
        return { error: 'Erro ao atualizar permissões.' };
    }
}
