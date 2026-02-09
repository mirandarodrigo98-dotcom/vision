'use server';

import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { getRolePermissions } from './permissions';
import { sendDismissalNotification } from '@/lib/emails/notifications';
import { generateDismissalPDF } from '@/lib/pdf-generator';
import { checkPendingRequests } from './employees';

// Helper to generate Protocol Number (YYYYMMDD + 8 digits)
function generateProtocolNumber() {
    const dateStr = format(new Date(), 'yyyyMMdd');
    const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `${dateStr}${randomPart}`;
}

// ----------------------------------------------------------------------
// GET DISMISSALS
// ----------------------------------------------------------------------
export async function getDismissals(
    page = 1, 
    limit = 10, 
    search = '', 
    status = 'ALL',
    companyId = 'ALL'
) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    try {
        const offset = (page - 1) * limit;
        let query = `
            SELECT d.*, 
                   cc.nome as company_name, 
                   e.name as employee_name,
                   u.name as created_by_name
            FROM dismissals d
            JOIN client_companies cc ON d.company_id = cc.id
            JOIN employees e ON d.employee_id = e.id
            LEFT JOIN users u ON d.created_by_user_id = u.id
            WHERE 1=1
        `;
        const params: any[] = [];

        // Filter by company permission (if not admin)
        if (session.role === 'client_user') {
            query += ` AND d.company_id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
            params.push(session.user_id);
        }

        if (search) {
            query += ` AND (e.name LIKE ? OR d.protocol_number LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (status !== 'ALL') {
            query += ` AND d.status = ?`;
            params.push(status);
        }

        if (companyId !== 'ALL') {
            query += ` AND d.company_id = ?`;
            params.push(companyId);
        }

        const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
        const totalResult = await db.prepare(countQuery).get(...params) as { total: number };
        
        query += ` ORDER BY d.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const dismissals = await db.prepare(query).all(...params);

        return {
            dismissals,
            total: totalResult.total,
            pages: Math.ceil(totalResult.total / limit)
        };

    } catch (error) {
        console.error('Error fetching dismissals:', error);
        return { error: 'Erro ao buscar rescisões.' };
    }
}

// ----------------------------------------------------------------------
// GET DISMISSAL BY ID
// ----------------------------------------------------------------------
export async function getDismissal(id: string) {
    const session = await getSession();
    if (!session) return null;

    try {
        let query = `
            SELECT d.*, 
                   cc.nome as company_name, 
                   e.name as employee_name
            FROM dismissals d
            JOIN client_companies cc ON d.company_id = cc.id
            JOIN employees e ON d.employee_id = e.id
            WHERE d.id = ?
        `;

        const dismissal = await db.prepare(query).get(id) as any;

        if (!dismissal) return null;

        // Check permission
        if (session.role === 'client_user') {
            const hasAccess = await db.prepare(`
                SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
            `).get(session.user_id, dismissal.company_id);
            if (!hasAccess) return null;
        }

        return dismissal;
    } catch (error) {
        console.error('Error fetching dismissal:', error);
        return null;
    }
}

// ----------------------------------------------------------------------
// CREATE DISMISSAL
// ----------------------------------------------------------------------
export async function createDismissal(formData: FormData) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Permission check
    let hasPermission = false;
    if (session.role === 'admin') hasPermission = true;
    else {
        const permissions = await getRolePermissions(session.role);
        hasPermission = permissions.includes('dismissals.create'); // Ensure this permission key exists or is added
    }

    if (!hasPermission) return { error: 'Sem permissão para criar rescisão.' };

    const company_id = formData.get('company_id') as string;
    const employee_id = formData.get('employee_id') as string;
    const notice_type = formData.get('notice_type') as string;
    const dismissal_cause = formData.get('dismissal_cause') as string;
    const dismissal_date = formData.get('dismissal_date') as string;
    const observations = formData.get('observations') as string;

    if (!company_id || !employee_id || !notice_type || !dismissal_cause || !dismissal_date) {
        return { error: 'Preencha todos os campos obrigatórios.' };
    }

    // Check if user has access to this company
    if (session.role === 'client_user') {
        const hasAccess = await db.prepare(`
            SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
        `).get(session.user_id, company_id);
        if (!hasAccess) return { error: 'Você não tem acesso a esta empresa.' };
    }

    // Fetch details for email/PDF
    const company = await db.prepare('SELECT nome, cnpj FROM client_companies WHERE id = ?').get(company_id) as any;
    const employee = await db.prepare('SELECT name FROM employees WHERE id = ?').get(employee_id) as any;

    if (!company || !employee) {
        return { error: 'Empresa ou funcionário não encontrados.' };
    }

    // Check for pending requests
    const pending = await checkPendingRequests(employee_id);
    if (pending) {
        return { error: `Este funcionário já possui uma solicitação de ${pending.type} em andamento.` };
    }

    try {
        const id = randomUUID();
        const protocol_number = generateProtocolNumber();

        await db.prepare(`
            INSERT INTO dismissals (
                id, company_id, employee_id, notice_type, dismissal_cause, 
                dismissal_date, observations, protocol_number, created_by_user_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, company_id, employee_id, notice_type, dismissal_cause,
            dismissal_date, observations, protocol_number, session.user_id
        );

        await logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'CREATE_DISMISSAL',
            role: session.role,
            entity_type: 'dismissals',
            entity_id: id,
            metadata: { protocol_number, company_id, employee_id },
            success: true
        });

        // Send Email Notification
        const pdfBytes = await generateDismissalPDF({
            company_name: company.nome,
            companyCNPJ: company.cnpj,
            employee_name: employee.name,
            notice_type: notice_type,
            reason: dismissal_cause,
            dismissal_date: dismissal_date,
            observations: observations,
            protocol_number: protocol_number
        });

        const pdfBuffer = Buffer.from(pdfBytes);

        await sendDismissalNotification('NEW', {
            userName: session.name || session.email,
            companyName: company.nome,
            cnpj: company.cnpj,
            employeeName: employee.name,
            pdfBuffer: pdfBuffer,
            senderEmail: session.email
        });

        revalidatePath('/admin/dismissals');
        revalidatePath('/app/dismissals');

        return { success: true, id };
    } catch (error) {
        console.error('Error creating dismissal:', error);
        return { error: 'Erro ao criar rescisão.' };
    }
}

// ----------------------------------------------------------------------
// UPDATE DISMISSAL
// ----------------------------------------------------------------------
export async function updateDismissal(id: string, formData: FormData) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const dismissal = await getDismissal(id);
    if (!dismissal) return { error: 'Rescisão não encontrada.' };

    if (dismissal.status === 'CANCELLED' || dismissal.status === 'COMPLETED') {
        return { error: 'Não é possível editar rescisão finalizada ou cancelada.' };
    }

    // Check deadline (1 day before)
    const disDate = new Date(dismissal.dismissal_date);
    const deadline = new Date(disDate);
    deadline.setDate(deadline.getDate() - 1);
    
    // Reset time
    const now = new Date();
    now.setHours(0,0,0,0);
    deadline.setHours(0,0,0,0);

    // Admin can always edit if not completed/cancelled
    if (session.role !== 'admin' && now > deadline) {
        return { error: 'Prazo para edição expirado (1 dia antes do desligamento).' };
    }

    const notice_type = formData.get('notice_type') as string;
    const dismissal_cause = formData.get('dismissal_cause') as string;
    const dismissal_date = formData.get('dismissal_date') as string;
    const observations = formData.get('observations') as string;

    try {
        await db.prepare(`
            UPDATE dismissals 
            SET notice_type = ?, dismissal_cause = ?, dismissal_date = ?, observations = ?, status = 'RECTIFIED', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(notice_type, dismissal_cause, dismissal_date, observations, id);

        await logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'UPDATE_DISMISSAL',
            entity_type: 'dismissals',
            entity_id: id,
            metadata: { notice_type, dismissal_cause, dismissal_date },
            success: true
        });

        // Fetch CNPJ for PDF
        const company = await db.prepare('SELECT cnpj FROM client_companies WHERE id = ?').get(dismissal.company_id) as any;

        // Detect changes
    const changes: string[] = [];
    const normalize = (val: any) => val === null || val === undefined ? '' : String(val).trim();

    if (normalize(dismissal.notice_type) !== normalize(notice_type)) changes.push('notice_type');
    if (normalize(dismissal.dismissal_cause) !== normalize(dismissal_cause)) changes.push('reason'); // Key must match PDF generator
    if (normalize(dismissal.dismissal_date) !== normalize(dismissal_date)) changes.push('dismissal_date');
    if (normalize(dismissal.observations) !== normalize(observations)) changes.push('observations');

    // Send Email Notification
        if (company) {
            const pdfBytes = await generateDismissalPDF({
                company_name: dismissal.company_name,
                companyCNPJ: company.cnpj,
                employee_name: dismissal.employee_name,
                notice_type: notice_type,
                reason: dismissal_cause,
                dismissal_date: dismissal_date,
                observations: observations,
                protocol_number: dismissal.protocol_number,
                changes
            });

            const pdfBuffer = Buffer.from(pdfBytes);

            await sendDismissalNotification('UPDATE', {
                userName: session.name || session.email,
                companyName: dismissal.company_name,
                cnpj: company.cnpj,
                employeeName: dismissal.employee_name,
                pdfBuffer: pdfBuffer,
                changes,
                senderEmail: session.email
            });
        }

        revalidatePath('/admin/dismissals');
        revalidatePath('/app/dismissals');

        return { success: true };
    } catch (error) {
        console.error('Error updating dismissal:', error);
        return { error: 'Erro ao atualizar rescisão.' };
    }
}

// ----------------------------------------------------------------------
// CANCEL DISMISSAL
// ----------------------------------------------------------------------
export async function cancelDismissal(id: string) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const dismissal = await getDismissal(id);
    if (!dismissal) return { error: 'Rescisão não encontrada.' };

    if (dismissal.status !== 'SUBMITTED') {
        return { error: 'Apenas solicitações pendentes podem ser canceladas.' };
    }

    // Check deadline (1 day before)
    const disDate = new Date(dismissal.dismissal_date);
    const deadline = new Date(disDate);
    deadline.setDate(deadline.getDate() - 1);
    
    const now = new Date();
    now.setHours(0,0,0,0);
    deadline.setHours(0,0,0,0);

    if (session.role !== 'admin' && now > deadline) {
        return { error: 'Prazo para cancelamento expirado.' };
    }

    try {
        db.prepare(`
            UPDATE dismissals SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?
        `).run(id);

        await logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'CANCEL_DISMISSAL',
            entity_type: 'dismissals',
            entity_id: id,
            metadata: { prev_status: dismissal.status },
            success: true
        });

        // Fetch CNPJ
        const company = db.prepare('SELECT cnpj FROM client_companies WHERE id = ?').get(dismissal.company_id) as any;

        if (company) {
             let notifType: 'CANCEL' | 'CANCEL_BY_ADMIN' = 'CANCEL';
             let recipientEmail: string | undefined = undefined;

             if (session.role === 'admin' || session.role === 'operator') {
                 notifType = 'CANCEL_BY_ADMIN';
                 const creator = await db.prepare('SELECT email FROM users WHERE id = ?').get(dismissal.created_by_user_id) as { email: string };
                 recipientEmail = creator?.email;
             }

             await sendDismissalNotification(notifType, {
                userName: session.name || session.email,
                companyName: dismissal.company_name,
                cnpj: company.cnpj,
                employeeName: dismissal.employee_name,
                recipientEmail,
                senderEmail: session.email
            });
        }

        revalidatePath('/admin/dismissals');
        revalidatePath('/app/dismissals');

        return { success: true };
    } catch (error) {
        console.error('Error cancelling dismissal:', error);
        return { error: 'Erro ao cancelar rescisão.' };
    }
}

// ----------------------------------------------------------------------
// APPROVE DISMISSAL (Admin Only)
// ----------------------------------------------------------------------
export async function approveDismissal(id: string) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
        return { error: 'Unauthorized' };
    }

    const dismissal = await getDismissal(id);
    if (!dismissal) return { error: 'Rescisão não encontrada.' };

    if (dismissal.status !== 'SUBMITTED') {
        return { error: 'Esta solicitação não está pendente.' };
    }

    try {
        // Get creator info for email
        const creator = await db.prepare('SELECT email, name FROM users WHERE id = ?').get(dismissal.created_by_user_id) as { email: string, name: string };
        const company = await db.prepare('SELECT nome, cnpj FROM client_companies WHERE id = ?').get(dismissal.company_id) as any;
        const employee = await db.prepare('SELECT name FROM employees WHERE id = ?').get(dismissal.employee_id) as any;

        const txn = db.transaction(async () => {
            // Update dismissal status
            await db.prepare(`
                UPDATE dismissals SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(id);

            // Update employee status to inactive
            await db.prepare(`UPDATE employees SET is_active = 0, status = 'Desligado', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(dismissal.employee_id);
        });
        await txn();

        await logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'APPROVE_DISMISSAL',
            entity_type: 'dismissals',
            entity_id: id,
            metadata: { employee_id: dismissal.employee_id },
            success: true
        });

        // Generate PDF for completion record (optional but good for consistency)
        const pdfBytes = await generateDismissalPDF({
            company_name: company.nome,
            companyCNPJ: company.cnpj,
            employee_name: employee.name,
            notice_type: dismissal.notice_type,
            reason: dismissal.dismissal_cause,
            dismissal_date: dismissal.dismissal_date,
            observations: dismissal.observations,
            protocol_number: dismissal.protocol_number
        });
        const pdfBuffer = Buffer.from(pdfBytes);

        // Send Email to Creator
        await sendDismissalNotification('COMPLETED', {
            userName: creator?.name || 'Cliente',
            recipientEmail: creator?.email,
            companyName: company.nome,
            cnpj: company.cnpj,
            employeeName: employee.name,
            pdfBuffer: pdfBuffer,
            senderEmail: session.email
        });

        revalidatePath('/admin/dismissals');
        revalidatePath('/app/dismissals');

        return { success: true };
    } catch (error) {
        console.error('Error approving dismissal:', error);
        return { error: 'Erro ao aprovar rescisão.' };
    }
}

// ----------------------------------------------------------------------
// COMPLETE DISMISSAL (Update dismissal date in employees)
// ----------------------------------------------------------------------
export async function completeDismissal(id: string) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
        return { error: 'Unauthorized' };
    }

    const dismissal = await db.prepare('SELECT * FROM dismissals WHERE id = ?').get(id) as any;
    if (!dismissal) return { error: 'Rescisão não encontrada.' };

    try {
        const txn = db.transaction(async () => {
             // Update dismissal status
             await db.prepare("UPDATE dismissals SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
             
             // Update employee dismissal date
             await db.prepare("UPDATE employees SET dismissal_date = ? WHERE id = ?").run(dismissal.dismissal_date, dismissal.employee_id);
        });

        await txn();

        revalidatePath('/admin/dismissals');
        revalidatePath('/admin/employees');
        return { success: true };
    } catch (error) {
        console.error('Error completing dismissal:', error);
        return { error: 'Erro ao concluir rescisão.' };
    }
}
