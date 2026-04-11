
'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface Department {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export async function getDepartments() {
    try {
        const session = await getSession();
        if (!session) {
            return { error: 'Unauthorized' };
        }

        const result = (await db.query('SELECT * FROM departments ORDER BY name ASC', [])).rows;
        return { data: result as Department[] };
    } catch (error) {
        console.error('Error fetching departments:', error);
        return { error: 'Failed to fetch departments' };
    }
}

export async function getDepartment(id: string) {
    try {
        const session = await getSession();
        if (!session) {
            return { error: 'Unauthorized' };
        }

        const result = (await db.query(`SELECT * FROM departments WHERE id = $1`, [id])).rows[0];
        return { data: result as Department };
    } catch (error) {
        console.error('Error fetching department:', error);
        return { error: 'Failed to fetch department' };
    }
}

export async function createDepartment(data: { name: string; description?: string }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return { error: 'Unauthorized' };
        }

        const { name, description } = data;

        await db.query(`INSERT INTO departments (name, description) VALUES ($1, $2)`, [name, description || null]);

        revalidatePath('/admin/registrations/departments');
        return { success: true };
    } catch (error) {
        console.error('Error creating department:', error);
        return { error: 'Failed to create department' };
    }
}

export async function updateDepartment(id: string, data: { name: string; description?: string }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return { error: 'Unauthorized' };
        }

        const { name, description } = data;

        await db.query(`UPDATE departments SET name = $1, description = $2, updated_at = NOW() WHERE id = $3`, [name, description || null, id]);

        revalidatePath('/admin/registrations/departments');
        return { success: true };
    } catch (error) {
        console.error('Error updating department:', error);
        return { error: 'Failed to update department' };
    }
}

export async function deleteDepartment(id: string) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return { error: 'Unauthorized' };
        }

        // Check if department has users
        const usersCount = (await db.query(`SELECT COUNT(*) as count FROM users WHERE department_id = $1`, [id])).rows[0] as { count: number };
        if (usersCount.count > 0) {
            return { error: 'Não é possível excluir um departamento que possui usuários vinculados.' };
        }

        await db.query(`DELETE FROM departments WHERE id = $1`, [id]);

        revalidatePath('/admin/registrations/departments');
        return { success: true };
    } catch (error) {
        console.error('Error deleting department:', error);
        return { error: 'Failed to delete department' };
    }
}

export async function getDepartmentPermissions(departmentId: string) {
    try {
        const session = await getSession();
        if (!session) {
            return { error: 'Unauthorized' };
        }

        const result = (await db.query(`SELECT permission_code FROM department_permissions WHERE department_id = $1`, [departmentId])).rows as { permission_code: string }[];
        return { data: result.map(r => r.permission_code) };
    } catch (error) {
        console.error('Error fetching department permissions:', error);
        return { error: 'Failed to fetch department permissions' };
    }
}

export async function updateDepartmentPermissions(departmentId: string, permissions: string[]) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return { error: 'Unauthorized' };
        }

        const updateTransaction = await db.transaction(async () => {
            // Remove all existing permissions for the department
            await db.query(`DELETE FROM department_permissions WHERE department_id = $1`, [departmentId]);
            
            // Insert new permissions
            
            for (const perm of permissions) {
                await db.query(`INSERT INTO department_permissions (department_id, permission_code) VALUES ($1, $2)`, [departmentId, perm]);
            }
        });

        await updateTransaction();
        
        // Revalidate critical paths to ensure permissions update immediately
        revalidatePath('/admin/permissions');
        revalidatePath('/admin/dashboard');
        revalidatePath('/', 'layout'); // Force global revalidation (menu, protected routes)
        
        return { success: true };
    } catch (error) {
        console.error('Error updating department permissions:', error);
        return { error: 'Erro ao atualizar permissões do departamento.' };
    }
}
