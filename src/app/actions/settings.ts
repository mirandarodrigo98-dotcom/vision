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
            const insert = db.prepare(`
                INSERT INTO settings (key, value) 
                VALUES (?, ?)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            `);
            for (const item of items) {
                await insert.run(item.key, item.value);
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
