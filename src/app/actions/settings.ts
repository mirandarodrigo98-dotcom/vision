'use server';

import db from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function updateSettings(settings: { key: string; value: string }[]) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { error: 'Unauthorized' };
    }

    try {
        const updateTransaction = await db.transaction(async (items: typeof settings) => {
            
            for (const item of items) {
                await db.query(`
                INSERT INTO settings (key, value) 
                VALUES ($1, $2)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            `, [item.key, item.value]);
            }
        });

        await updateTransaction(settings);

        logAudit({
            action: 'UPDATE_SETTINGS',
            actor_user_id: session.user_id,
            actor_email: session.email,
            role: 'admin',
            entity_type: 'settings',
            entity_id: 'BATCH_UPDATE',
            metadata: { settings },
            success: true
        });

        revalidatePath('/admin/settings');
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function clearPersonnelMovements() {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return { error: 'Acesso negado. Apenas administradores podem executar esta ação.' };
    }

    try {
        const performClear = db.transaction(async () => {
            // 1. Delete dependent records first (children)
            
            // Vacations (linked to employees)
            await db.query('DELETE FROM vacations', []);
            
            // Leaves (linked to employees)
            await db.query('DELETE FROM leaves', []);
            
            // Dismissals (linked to employees)
            await db.query('DELETE FROM dismissals', []);
            
            // Admission Attachments (linked to admission_requests)
            await db.query('DELETE FROM admission_attachments', []);
            
            // 2. Delete main records
            
            // Admission Requests
            await db.query('DELETE FROM admission_requests', []);
            
            // Transfer Requests
            await db.query('DELETE FROM transfer_requests', []);
            
            // Employees (linked to companies, but parent to vacations/leaves/dismissals)
            await db.query('DELETE FROM employees', []);
        });

        await performClear();

        await logAudit({
            action: 'CLEAR_PERSONNEL_MOVEMENTS',
            actor_user_id: session.user_id,
            actor_email: session.email,
            role: session.role,
            entity_type: 'system',
            entity_id: 'ALL',
            metadata: { description: 'Limpeza completa de movimentações do módulo pessoal' },
            success: true
        });

        revalidatePath('/admin/dashboard');
        revalidatePath('/admin/employees');
        revalidatePath('/admin/admissions');
        revalidatePath('/admin/vacations');
        revalidatePath('/admin/leaves');
        revalidatePath('/admin/transfers');
        revalidatePath('/admin/dismissals');
        
        return { success: true };
    } catch (error: any) {
        console.error('Error clearing personnel movements:', error);
        return { error: 'Erro ao limpar dados: ' + error.message };
    }
}
