'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { sendTransportVoucherCreatedEmail, sendTransportVoucherStatusEmail } from '@/lib/emails/notifications';
import { generateTransportVoucherPDF } from '@/lib/pdf-generator';
import { logAudit } from '@/lib/audit';

export async function getTransportVouchers(companyId?: string) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    let query = `
        SELECT vt.*, c.razao_social as company_name, c.cnpj as company_cnpj, u.name as created_by_name
        FROM transport_vouchers vt
        JOIN client_companies c ON vt.company_id = c.id
        LEFT JOIN users u ON vt.created_by_user_id = u.id
        WHERE 1=1
    `;
    const params: any[] = [];

    if (session.role === 'client_user') {
        query += ` AND vt.company_id IN (SELECT company_id FROM user_companies WHERE user_id = $${params.length + 1})`;
        params.push(session.user_id);
    } else if (session.role === 'operator') {
        query += ` AND vt.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $${params.length + 1})`;
        params.push(session.user_id);
    }

    if (companyId) {
        params.push(companyId);
        query += ` AND vt.company_id = $${params.length}`;
    }

    query += ` ORDER BY vt.created_at DESC`;

    return (await db.query(query, params)).rows as any[];
}

export async function getTransportVoucherById(id: string) {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');

    const vt = (await db.query(`
        SELECT vt.*, c.razao_social as company_name, c.cnpj as company_cnpj, u.name as created_by_name
        FROM transport_vouchers vt
        JOIN client_companies c ON vt.company_id = c.id
        LEFT JOIN users u ON vt.created_by_user_id = u.id
        WHERE vt.id = $1
    `, [id])).rows[0] as any;

    if (!vt) return null;

    const employees = (await db.query(`
        SELECT vte.*, e.nome as employee_name, e.cpf as employee_cpf, e.codigo as employee_code
        FROM transport_voucher_employees vte
        JOIN employees e ON vte.employee_id = e.id
        WHERE vte.transport_voucher_id = $1
        ORDER BY e.nome ASC
    `, [id])).rows as any[];

    return { ...vt, employees };
}

export async function createTransportVoucher(data: { company_id: string, reference_month: number, reference_year: number, notes?: string, employees: any[] }, isDraft: boolean = false) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const vtId = randomUUID();
    const status = isDraft ? 'DRAFT' : 'PENDING';

    try {
        await db.transaction(async () => {
            await db.query(`
                INSERT INTO transport_vouchers (id, company_id, reference_month, reference_year, status, notes, created_by_user_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [vtId, data.company_id, data.reference_month, data.reference_year, status, data.notes || null, session.user_id]);

            for (const emp of data.employees) {
                await db.query(`
                    INSERT INTO transport_voucher_employees (id, transport_voucher_id, employee_id, quantity, value, total, line, observation)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [randomUUID(), vtId, emp.employee_id, emp.quantity, emp.value, emp.total, emp.line || null, emp.observation || null]);
            }
        });

        if (!isDraft) {
            const vt = await getTransportVoucherById(vtId);
            if (vt) {
                const pdfBuffer = await generateTransportVoucherPDF(vt);
                await sendTransportVoucherCreatedEmail(vt, pdfBuffer);
            }
        }

        revalidatePath('/app/vt');
        revalidatePath('/admin/vt');
        return { success: true, id: vtId };
    } catch (error: any) {
        console.error('Error creating VT:', error);
        return { error: 'Erro ao criar pedido de Vale Transporte.' };
    }
}

export async function updateTransportVoucher(id: string, data: { reference_month: number, reference_year: number, notes?: string, employees: any[] }, isDraft: boolean = false) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    try {
        const currentVt = (await db.query(`SELECT status FROM transport_vouchers WHERE id = $1`, [id])).rows[0] as any;
        if (!currentVt || currentVt.status !== 'DRAFT') {
            return { error: 'Apenas rascunhos podem ser editados.' };
        }

        const newStatus = isDraft ? 'DRAFT' : 'PENDING';

        await db.transaction(async () => {
            await db.query(`
                UPDATE transport_vouchers 
                SET reference_month = $1, reference_year = $2, notes = $3, status = $4, updated_at = CURRENT_TIMESTAMP
                WHERE id = $5
            `, [data.reference_month, data.reference_year, data.notes || null, newStatus, id]);

            await db.query(`DELETE FROM transport_voucher_employees WHERE transport_voucher_id = $1`, [id]);

            for (const emp of data.employees) {
                await db.query(`
                    INSERT INTO transport_voucher_employees (id, transport_voucher_id, employee_id, quantity, value, total, line, observation)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [randomUUID(), id, emp.employee_id, emp.quantity, emp.value, emp.total, emp.line || null, emp.observation || null]);
            }
        });

        if (!isDraft) {
            const vt = await getTransportVoucherById(id);
            if (vt) {
                const pdfBuffer = await generateTransportVoucherPDF(vt);
                await sendTransportVoucherCreatedEmail(vt, pdfBuffer);
            }
        }

        revalidatePath('/app/vt');
        revalidatePath('/admin/vt');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating VT:', error);
        return { error: 'Erro ao atualizar pedido de Vale Transporte.' };
    }
}

export async function deleteTransportVoucher(id: string) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    try {
        const currentVt = (await db.query(`SELECT status FROM transport_vouchers WHERE id = $1`, [id])).rows[0] as any;
        if (!currentVt || currentVt.status !== 'DRAFT') {
            return { error: 'Apenas rascunhos podem ser excluídos.' };
        }

        await db.query(`DELETE FROM transport_vouchers WHERE id = $1`, [id]);
        
        revalidatePath('/app/vt');
        return { success: true };
    } catch (error: any) {
        console.error('Error deleting VT:', error);
        return { error: 'Erro ao excluir rascunho.' };
    }
}

export async function approveTransportVoucher(id: string) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) return { error: 'Unauthorized' };

    try {
        await db.query(`UPDATE transport_vouchers SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
        
        const vt = await getTransportVoucherById(id);
        if (vt) {
            await sendTransportVoucherStatusEmail(vt, 'COMPLETED');
        }

        logAudit({ action: 'APPROVE_VT', actor_user_id: session.user_id, actor_email: session.email, role: session.role, success: true, metadata: { vt_id: id } });

        revalidatePath('/admin/vt');
        revalidatePath('/app/vt');
        return { success: true };
    } catch (error: any) {
        console.error('Error approving VT:', error);
        return { error: 'Erro ao concluir pedido.' };
    }
}

export async function cancelTransportVoucher(id: string, reason: string) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) return { error: 'Unauthorized' };

    try {
        await db.query(`
            UPDATE transport_vouchers 
            SET status = 'CANCELLED', notes = CONCAT(COALESCE(notes, ''), '\nMotivo Cancelamento: ', $1), updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2
        `, [reason, id]);
        
        const vt = await getTransportVoucherById(id);
        if (vt) {
            await sendTransportVoucherStatusEmail(vt, 'CANCELLED', reason);
        }

        logAudit({ action: 'CANCEL_VT', actor_user_id: session.user_id, actor_email: session.email, role: session.role, success: true, metadata: { vt_id: id, reason } });

        revalidatePath('/admin/vt');
        revalidatePath('/app/vt');
        return { success: true };
    } catch (error: any) {
        console.error('Error canceling VT:', error);
        return { error: 'Erro ao cancelar pedido.' };
    }
}
