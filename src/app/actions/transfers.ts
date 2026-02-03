'use server';

import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { sendTransferNotification } from '@/lib/emails/notifications';

// Helper to generate Protocol Number
function generateProtocolNumber() {
    const dateStr = format(new Date(), 'yyyyMMdd');
    const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `${dateStr}${randomPart}`;
}

export async function createTransfer(formData: FormData) {
    const session = await getSession();
    if (!session || session.role !== 'client_user') {
        return { error: 'Unauthorized' };
    }

    try {
        const sourceCompanyId = formData.get('source_company_id') as string;
        const employeeName = formData.get('employee_name') as string;
        const targetCompanyId = formData.get('target_company_id') as string;
        const transferDate = formData.get('transfer_date') as string;
        const observations = formData.get('observations') as string;

        if (!sourceCompanyId || !employeeName || !targetCompanyId || !transferDate) {
            return { error: 'Campos obrigatórios faltando.' };
        }

        // Validate source company access
        const userCompanyData = await db.prepare(`
            SELECT cc.id, cc.nome, cc.cnpj 
            FROM client_companies cc
            JOIN user_companies uc ON uc.company_id = cc.id
            WHERE uc.user_id = ? AND cc.id = ?
        `).get(session.user_id, sourceCompanyId) as { id: string, nome: string, cnpj: string };

        if (!userCompanyData) {
            return { error: 'Você não tem permissão para esta empresa de origem.' };
        }

        // Validate target company exists (and get name for redundancy/legacy)
        const targetCompany = await db.prepare('SELECT nome FROM client_companies WHERE id = ?').get(targetCompanyId) as { nome: string };
        if (!targetCompany) {
             return { error: 'Empresa destino inválida.' };
        }

        const protocolNumber = generateProtocolNumber();
        const transferId = randomUUID();

        await db.prepare(`
            INSERT INTO transfer_requests (
                id, source_company_id, target_company_id, target_company_name, employee_name, 
                transfer_date, observations, status, protocol_number, 
                created_by_user_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
            transferId, sourceCompanyId, targetCompanyId, targetCompany.nome, employeeName, 
            transferDate, observations, protocolNumber, session.user_id
        );

        // Audit Log
        logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'CREATE_TRANSFER',
            entity_type: 'TRANSFER_REQUEST',
            entity_id: transferId,
            metadata: { protocolNumber, sourceCompanyId, targetCompanyId, targetCompanyName: targetCompany.nome, employeeName },
            success: true
        });

        // Get Settings
        
        await sendTransferNotification('NEW', {
            userName: session.name || session.email,
            sourceCompany: userCompanyData.nome,
            targetCompany: targetCompany.nome,
            employeeName,
            transferDate: format(new Date(transferDate), 'dd/MM/yyyy'),
            observation: observations
        });

        revalidatePath('/app/transfers');
        return { success: true, id: transferId, protocol_number: protocolNumber };

    } catch (error) {
        console.error('Create Transfer Error:', error);
        return { error: 'Erro ao criar solicitação de transferência.' };
    }
}

export async function updateTransfer(id: string, formData: FormData) {
    const session = await getSession();
    if (!session) {
        return { error: 'Unauthorized' };
    }
    if (session.role !== 'client_user' && session.role !== 'admin') {
         return { error: 'Unauthorized' };
    }

    try {
        const transfer = await db.prepare('SELECT * FROM transfer_requests WHERE id = ?').get(id) as any;
        if (!transfer) return { error: 'Transferência não encontrada.' };

        // Validate permission (creator or company access?)
        // Usually company access is better.
        if (session.role === 'client_user') {
            const hasAccess = await db.prepare(`
                SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
            `).get(session.user_id, transfer.source_company_id);

            if (!hasAccess && transfer.created_by_user_id !== session.user_id) {
                return { error: 'Sem permissão.' };
            }
        }

        // Allow update only if not CANCELLED? Or allow rectification always?
        // Admissions logic: Retification allowed until 1 day before.
        // We will implement basic update first.

        const targetCompanyId = formData.get('target_company_id') as string;
        const transferDate = formData.get('transfer_date') as string;
        const observations = formData.get('observations') as string;
        // Employee name immutable in rectification?
        // User memory says: "Employee name is immutable in this mode" for admissions. 
        // Let's assume the same here.

        // Validate target company exists
        const targetCompany = await db.prepare('SELECT nome FROM client_companies WHERE id = ?').get(targetCompanyId) as { nome: string };
        if (!targetCompany) {
             return { error: 'Empresa destino inválida.' };
        }

        // Detect changes
        const changes: string[] = [];
        if (transfer.target_company_id !== targetCompanyId) changes.push('target_company_id');
        if (transfer.transfer_date !== transferDate) changes.push('transfer_date');
        if (transfer.observations !== observations) changes.push('observation');

        await db.prepare(`
            UPDATE transfer_requests 
            SET target_company_id = ?, target_company_name = ?, transfer_date = ?, observations = ?, updated_at = datetime('now', '-03:00')
            WHERE id = ?
        `).run(targetCompanyId, targetCompany.nome, transferDate, observations, id);

         // Audit Log
         logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'UPDATE_TRANSFER',
            entity_type: 'TRANSFER_REQUEST',
            entity_id: id,
            metadata: { targetCompanyId, targetCompanyName: targetCompany.nome, transferDate },
            success: true
        });

        // Send Notification
        const sourceCompany = await db.prepare('SELECT nome FROM client_companies WHERE id = ?').get(transfer.source_company_id) as { nome: string };
        
        await sendTransferNotification('UPDATE', {
            userName: session.name || session.email,
            sourceCompany: sourceCompany.nome,
            targetCompany: targetCompany.nome,
            employeeName: transfer.employee_name,
            transferDate: format(new Date(transferDate), 'dd/MM/yyyy'),
            observation: observations,
            changes
        });

        revalidatePath('/app/transfers');
        revalidatePath(`/app/transfers/${id}/edit`);
        return { success: true };

    } catch (error) {
        console.error('Update Transfer Error:', error);
        return { error: 'Erro ao atualizar transferência.' };
    }
}

export async function cancelTransfer(id: string) {
    const session = await getSession();
    if (!session) {
        return { error: 'Unauthorized' };
    }
    if (session.role !== 'client_user' && session.role !== 'admin') {
         return { error: 'Unauthorized' };
    }

    try {
        const transfer = db.prepare('SELECT * FROM transfer_requests WHERE id = ?').get(id) as any;
        if (!transfer) return { error: 'Transferência não encontrada.' };

        if (session.role === 'client_user') {
             const hasAccess = db.prepare(`
                SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
            `).get(session.user_id, transfer.source_company_id);

            if (!hasAccess && transfer.created_by_user_id !== session.user_id) {
                return { error: 'Sem permissão.' };
            }
        }

        db.prepare(`
            UPDATE transfer_requests 
            SET status = 'CANCELLED', updated_at = datetime('now', '-03:00')
            WHERE id = ?
        `).run(id);

        logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'CANCEL_TRANSFER',
            entity_type: 'TRANSFER_REQUEST',
            entity_id: id,
            metadata: { status: 'CANCELLED' },
            success: true
        });

        // Send Notification
        await sendTransferNotification('CANCEL', {
            userName: session.name || session.email,
            sourceCompany: '', // Not strictly needed for cancel template: "transferência de X para empresa Y foi CANCELADA pelo usuário Z"
            targetCompany: transfer.target_company_name,
            employeeName: transfer.employee_name,
            transferDate: '',
            observation: ''
        });

        revalidatePath('/app/transfers');
        return { success: true };
    } catch (error) {
        console.error('Cancel Transfer Error:', error);
        return { error: 'Erro ao cancelar transferência.' };
    }
}

export async function approveTransfer(id: string) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
        return { error: 'Unauthorized' };
    }

    try {
        const transfer = await db.prepare('SELECT * FROM transfer_requests WHERE id = ?').get(id) as any;
        if (!transfer) return { error: 'Transferência não encontrada.' };

        if (transfer.status !== 'SUBMITTED') {
             return { error: 'Apenas transferências pendentes podem ser aprovadas.' };
        }

        // Transaction to ensure consistency
        const approveTransaction = db.transaction(async () => {
            // 1. Update Transfer Status
            await db.prepare(`
                UPDATE transfer_requests 
                SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(id);

            // 2. Update Employee Company
            // Find employee by name and source company (to be safe)
            // Ideally we should have stored employee_id, but name+company is the key used in creation
            const employee = await db.prepare('SELECT id FROM employees WHERE name = ? AND company_id = ?').get(transfer.employee_name, transfer.source_company_id) as { id: string };
            
            if (employee) {
                await db.prepare(`UPDATE employees SET company_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(transfer.target_company_id, employee.id);
            } else {
                 throw new Error('Funcionário não encontrado na empresa de origem.');
            }
        });

        await approveTransaction();

        logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'APPROVE_TRANSFER',
            entity_type: 'TRANSFER_REQUEST',
            entity_id: id,
            metadata: { status: 'COMPLETED', targetCompanyId: transfer.target_company_id },
            success: true
        });

        revalidatePath('/app/transfers');
        revalidatePath('/admin/transfers');
        revalidatePath('/admin/employees'); // Refresh employee list
        return { success: true };

    } catch (error: any) {
        console.error('Approve Transfer Error:', error);
        return { error: error.message || 'Erro ao aprovar transferência.' };
    }
}

export async function getTransfers(companyId?: string) {
    const session = await getSession();
    if (!session) return [];

    let query = `
        SELECT tr.*, cc.nome as source_company_name 
        FROM transfer_requests tr
        JOIN client_companies cc ON tr.source_company_id = cc.id
    `;
    const params: any[] = [];

    if (session.role === 'client_user') {
        // Filter by companies the user has access to
        query += `
            JOIN user_companies uc ON uc.company_id = tr.source_company_id
            WHERE uc.user_id = ?
        `;
        params.push(session.user_id);

        if (companyId) {
            query += ` AND tr.source_company_id = ?`;
            params.push(companyId);
        }
    } else if (session.role === 'admin' || session.role === 'operator') {
        if (companyId) {
            query += ` WHERE tr.source_company_id = ?`;
            params.push(companyId);
        }
    }

    query += ` ORDER BY tr.created_at DESC`;

    return await db.prepare(query).all(...params);
}

export async function getTransfer(id: string) {
    const session = await getSession();
    if (!session) return null;

    const transfer = await db.prepare(`
        SELECT tr.*, cc.nome as source_company_name
        FROM transfer_requests tr
        JOIN client_companies cc ON tr.source_company_id = cc.id
        WHERE tr.id = ?
    `).get(id) as any;

    if (!transfer) return null;

    // Check permissions
    if (session.role === 'client_user') {
         const hasAccess = await db.prepare(`
            SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
        `).get(session.user_id, transfer.source_company_id);

        if (!hasAccess && transfer.created_by_user_id !== session.user_id) {
            return null;
        }
    }

    return transfer;
}
