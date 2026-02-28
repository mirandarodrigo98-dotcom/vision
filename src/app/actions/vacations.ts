'use server';

import { getSession } from '@/lib/auth';
import { checkPendingRequests } from './employees';

import db from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { calculateReturnDate } from '@/lib/holidays';
import { getRolePermissions } from './permissions';
import { sendVacationNotification } from '@/lib/emails/notifications';
import { generateVacationPDF } from '@/lib/pdf-generator';

// Helper to generate Protocol Number (YYYYMMDD + 8 digits)
function generateProtocolNumber() {
    const dateStr = format(new Date(), 'yyyyMMdd');
    const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `${dateStr}${randomPart}`;
}

// ----------------------------------------------------------------------
// GET VACATIONS
// ----------------------------------------------------------------------
export async function getVacations(
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
            SELECT v.*, 
                   cc.nome as company_name, 
                   e.name as employee_name,
                   u.name as created_by_name
            FROM vacations v
            JOIN client_companies cc ON v.company_id = cc.id
            JOIN employees e ON v.employee_id = e.id
            LEFT JOIN users u ON v.created_by_user_id = u.id
            WHERE 1=1
        `;
        const params: any[] = [];

        // Filter by company permission (if not admin)
        // Admin sees all, Operator sees all (usually), Client sees only their companies
        if (session.role === 'client_user') {
            query += ` AND v.company_id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
            params.push(session.user_id);
        }

        if (search) {
            query += ` AND (e.name LIKE ? OR v.protocol_number LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (status !== 'ALL') {
            query += ` AND v.status = ?`;
            params.push(status);
        }

        if (companyId !== 'ALL') {
            query += ` AND v.company_id = ?`;
            params.push(companyId);
        }

        const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
        const totalResult = await db.prepare(countQuery).get(...params) as { total: number };
        
        query += ` ORDER BY v.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const vacations = await db.prepare(query).all(...params);

        return {
            vacations,
            total: totalResult.total,
            pages: Math.ceil(totalResult.total / limit)
        };

    } catch (error) {
        console.error('Error fetching vacations:', error);
        return { error: 'Erro ao buscar férias.' };
    }
}

// ----------------------------------------------------------------------
// GET VACATION BY ID
// ----------------------------------------------------------------------
export async function getVacation(id: string) {
    const session = await getSession();
    if (!session) return null;

    try {
        const query = `
            SELECT v.*, 
                   cc.nome as company_name, 
                   e.name as employee_name
            FROM vacations v
            JOIN client_companies cc ON v.company_id = cc.id
            JOIN employees e ON v.employee_id = e.id
            WHERE v.id = ?
        `;

        const vacation = await db.prepare(query).get(id) as any;

        if (!vacation) return null;

        // Check permission
        if (session.role === 'client_user') {
            const hasAccess = await db.prepare(`
                SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
            `).get(session.user_id, vacation.company_id);
            if (!hasAccess) return null;
        }

        return vacation;
    } catch (error) {
        console.error('Error fetching vacation:', error);
        return null;
    }
}

// ----------------------------------------------------------------------
// CREATE VACATION
// ----------------------------------------------------------------------

export async function createVacation(formData: FormData) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Permission check
    let hasPermission = false;
    if (session.role === 'admin') hasPermission = true;
    else {
        const permissions = await getRolePermissions(session.role);
        hasPermission = permissions.includes('vacations.create');
    }

    if (!hasPermission) return { error: 'Sem permissão para criar solicitação de férias.' };

    try {
        const companyId = formData.get('company_id') as string;
        const employeeId = formData.get('employee_id') as string;
        const startDate = formData.get('start_date') as string;
        const daysQuantity = parseInt(formData.get('days_quantity') as string);
        const allowanceDays = parseInt(formData.get('allowance_days') as string || '0');
        const observations = formData.get('observations') as string;

        if (!companyId || !employeeId || !startDate || isNaN(daysQuantity)) {
            return { error: 'Campos obrigatórios faltando.' };
        }

        // Check for pending requests
        const pending = await checkPendingRequests(employeeId);
        if (pending) {
            return { error: `Este funcionário já possui uma solicitação de ${pending.type} em andamento.` };
        }

        // Validate company access for client_user
        if (session.role === 'client_user') {
            const hasAccess = await db.prepare(`
                SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
            `).get(session.user_id, companyId);
            if (!hasAccess) return { error: 'Sem permissão para esta empresa.' };
        }

        // Calculate Return Date
        // O usuário pediu: "Data Retorno Férias: Será resultado da data inical das férias + dias de férias. Se cair em um sábado, domingo ou feriado, retorna no próximo dia útil."
        const returnDate = calculateReturnDate(startDate, daysQuantity);
        const returnDateStr = format(returnDate, 'yyyy-MM-dd');

        const protocolNumber = generateProtocolNumber();
        const vacationId = randomUUID();

        await db.prepare(`
            INSERT INTO vacations (
                id, company_id, employee_id, start_date, days_quantity, allowance_days,
                return_date, observations, status, protocol_number,
                created_by_user_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, datetime('now', '-03:00'), datetime('now', '-03:00'))
        `).run(
            vacationId, companyId, employeeId, startDate, daysQuantity, allowanceDays,
            returnDateStr, observations, protocolNumber, session.user_id
        );

        logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'CREATE_VACATION',
            entity_type: 'VACATION',
            entity_id: vacationId,
            metadata: { protocolNumber, companyId, employeeId, startDate, daysQuantity },
            success: true
        });

        // Generate PDF and Send Email
        const companyName = await db.prepare('SELECT nome, cnpj FROM client_companies WHERE id = ?').get(companyId) as any;
        const employeeName = await db.prepare('SELECT name FROM employees WHERE id = ?').get(employeeId) as any;
        
        const pdfData = {
            company_name: companyName.nome,
            employee_name: employeeName.name,
            start_date: startDate,
            days_count: daysQuantity,
            allowance_days: allowanceDays,
            return_date: returnDateStr,
            observations
        };
        const pdfBuffer = await generateVacationPDF(pdfData);

        await sendVacationNotification('NEW', {
            companyName: companyName.nome,
            cnpj: companyName.cnpj,
            userName: session.name || session.email,
            employeeName: employeeName.name,
            pdfBuffer,
            senderEmail: session.email
        });

        revalidatePath('/admin/vacations');
        return { success: true, id: vacationId };

    } catch (error) {
        console.error('Create Vacation Error:', error);
        return { error: 'Erro ao criar solicitação de férias.' };
    }
}

// ----------------------------------------------------------------------
// UPDATE VACATION
// ----------------------------------------------------------------------
export async function updateVacation(id: string, formData: FormData) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Permission check (assuming 'edit' or 'create' implies update on draft/submitted)
    // Using 'vacations.create' or specific 'vacations.edit' if we add it. 
    // For now, let's assume create permission allows editing own requests or admin/operator can edit.
    let hasPermission = false;
    if (session.role === 'admin') hasPermission = true;
    else {
        const permissions = await getRolePermissions(session.role);
        hasPermission = permissions.includes('vacations.create'); // Simplified
    }
    
    if (!hasPermission) return { error: 'Sem permissão.' };

    try {
        const existingVacation = await db.prepare('SELECT * FROM vacations WHERE id = ?').get(id) as any;
        if (!existingVacation) return { error: 'Férias não encontradas.' };

        // Validate company access for client_user
        if (session.role === 'client_user') {
            const hasAccess = await db.prepare(`
                SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
            `).get(session.user_id, existingVacation.company_id);
            
            if (!hasAccess && existingVacation.created_by_user_id !== session.user_id) {
                return { error: 'Sem permissão para editar estas férias.' };
            }
        }

        const startDate = formData.get('start_date') as string;
        const daysQuantity = parseInt(formData.get('days_quantity') as string);
        const allowanceDays = parseInt(formData.get('allowance_days') as string || '0');
        const observations = formData.get('observations') as string;

        if (!startDate || isNaN(daysQuantity)) {
            return { error: 'Campos obrigatórios faltando.' };
        }

        const returnDate = calculateReturnDate(startDate, daysQuantity);
        const returnDateStr = format(returnDate, 'yyyy-MM-dd');

        // Detect changes
        const changes: string[] = [];
        const normalize = (val: any) => val === null || val === undefined ? '' : String(val).trim();
        
        // Helper to compare dates avoiding timezone issues
        const areDatesEqual = (dbVal: any, formVal: string) => {
            if (!dbVal && !formVal) return true;
            if (!dbVal || !formVal) return false;
            
            const formDate = String(formVal).trim().replace(/\uFEFF/g, '');
            const dbStr = String(dbVal).trim().replace(/\uFEFF/g, '');
            
            if (dbStr === formDate) return true;

            if (dbVal instanceof Date) {
                const utc = dbVal.toISOString().split('T')[0];
                const local = format(dbVal, 'yyyy-MM-dd');
                return utc === formDate || local === formDate;
            }
            
            if (dbStr.split('T')[0] === formDate) return true;
            if (dbStr.split(' ')[0] === formDate) return true;
            
            return false;
        };

        if (!areDatesEqual(existingVacation.start_date, startDate)) changes.push('start_date');
        if (existingVacation.days_quantity !== daysQuantity) changes.push('days_quantity');
        if (existingVacation.allowance_days !== allowanceDays) changes.push('allowance_days');
        if (normalize(existingVacation.observations) !== normalize(observations)) changes.push('observations');

        await db.prepare(`
            UPDATE vacations 
            SET start_date = ?, days_quantity = ?, allowance_days = ?, return_date = ?, 
                observations = ?, status = 'RECTIFIED', updated_at = datetime('now', '-03:00')
            WHERE id = ?
        `).run(startDate, daysQuantity, allowanceDays, returnDateStr, observations, id);

        logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'UPDATE_VACATION',
            entity_type: 'VACATION',
            entity_id: id,
            metadata: { startDate, daysQuantity },
            success: true
        });

        // Generate PDF and Send Email
        const companyName = await db.prepare('SELECT nome, cnpj FROM client_companies WHERE id = ?').get(existingVacation.company_id) as any;
        const employeeName = await db.prepare('SELECT name FROM employees WHERE id = ?').get(existingVacation.employee_id) as any;
        
        const pdfData = {
            company_name: companyName.nome,
            employee_name: employeeName.name,
            start_date: startDate,
            days_count: daysQuantity,
            allowance_days: allowanceDays,
            return_date: returnDateStr,
            observations,
            changes
        };
        const pdfBuffer = await generateVacationPDF(pdfData);

        await sendVacationNotification('UPDATE', {
            companyName: companyName.nome,
            cnpj: companyName.cnpj,
            userName: session.name || session.email,
            employeeName: employeeName.name,
            pdfBuffer,
            senderEmail: session.email
        });

        revalidatePath('/admin/vacations');
        return { success: true };

    } catch (error) {
        console.error('Update Vacation Error:', error);
        return { error: 'Erro ao atualizar férias.' };
    }
}

// ----------------------------------------------------------------------
// CANCEL VACATION
// ----------------------------------------------------------------------
export async function cancelVacation(id: string) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    let hasPermission = false;
    if (session.role === 'admin') hasPermission = true;
    else {
        const permissions = await getRolePermissions(session.role);
        hasPermission = permissions.includes('vacations.cancel');
    }

    if (!hasPermission) return { error: 'Sem permissão para cancelar.' };

    try {
        const vacation = await db.prepare('SELECT * FROM vacations WHERE id = ?').get(id) as any;
        if (!vacation) return { error: 'Férias não encontradas.' };

        // Validate company access for client_user
        if (session.role === 'client_user') {
            const hasAccess = await db.prepare(`
                SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
            `).get(session.user_id, vacation.company_id);
            
            if (!hasAccess && vacation.created_by_user_id !== session.user_id) {
                return { error: 'Sem permissão para cancelar estas férias.' };
            }
        }

        // Removed deadline check for cancellation to allow cancelling expired requests
        // The original logic was:
        /*
        const startDate = new Date(vacation.start_date);
        const deadline = new Date(startDate);
        deadline.setDate(deadline.getDate() - 1);
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        deadline.setHours(0, 0, 0, 0);

        if (session.role !== 'admin' && now > deadline) {
             return { error: 'Prazo para cancelamento expirado.' };
        }
        */

        await db.prepare(`
            UPDATE vacations 
            SET status = 'CANCELLED', updated_at = datetime('now', '-03:00')
            WHERE id = ?
        `).run(id);

        logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'CANCEL_VACATION',
            entity_type: 'VACATION',
            entity_id: id,
            metadata: {},
            success: true
        });

        // Send Email
        const companyName = await db.prepare('SELECT nome, cnpj FROM client_companies WHERE id = ?').get(vacation.company_id) as any;
        const employeeName = await db.prepare('SELECT name FROM employees WHERE id = ?').get(vacation.employee_id) as any;

        let notifType: 'CANCEL' | 'CANCEL_BY_ADMIN' = 'CANCEL';
        let recipientEmail: string | undefined = undefined;

        if (session.role === 'admin' || session.role === 'operator') {
            notifType = 'CANCEL_BY_ADMIN';
            const creator = await db.prepare('SELECT email FROM users WHERE id = ?').get(vacation.created_by_user_id) as { email: string };
            recipientEmail = creator?.email;
        }

        await sendVacationNotification(notifType, {
            companyName: companyName.nome,
            cnpj: companyName.cnpj,
            userName: session.name || session.email,
            employeeName: employeeName.name,
            recipientEmail,
            senderEmail: session.email
        });

        revalidatePath('/admin/vacations');
        return { success: true };

    } catch (error) {
        console.error('Cancel Vacation Error:', error);
        return { error: 'Erro ao cancelar férias.' };
    }
}

// ----------------------------------------------------------------------
// APPROVE VACATION
// ----------------------------------------------------------------------
export async function approveVacation(id: string) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    let hasPermission = false;
    if (session.role === 'admin') hasPermission = true;
    else {
        const permissions = await getRolePermissions(session.role);
        hasPermission = permissions.includes('vacations.approve');
    }

    if (!hasPermission) return { error: 'Sem permissão para aprovar.' };

    try {
        const vacation = await db.prepare('SELECT * FROM vacations WHERE id = ?').get(id) as any;
        if (!vacation) return { error: 'Férias não encontradas.' };

        if (vacation.status !== 'SUBMITTED' && vacation.status !== 'RECTIFIED') {
             return { error: 'Apenas solicitações pendentes ou retificadas podem ser aprovadas.' };
        }

        // Get creator info
        const creator = await db.prepare('SELECT email, name FROM users WHERE id = ?').get(vacation.created_by_user_id) as { email: string, name: string };
        const company = await db.prepare('SELECT nome, cnpj FROM client_companies WHERE id = ?').get(vacation.company_id) as { nome: string, cnpj: string };
        const employee = await db.prepare('SELECT name FROM employees WHERE id = ?').get(vacation.employee_id) as { name: string };

        await db.prepare(`
            UPDATE vacations 
            SET status = 'COMPLETED', updated_at = datetime('now', '-03:00')
            WHERE id = ?
        `).run(id);

        logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'APPROVE_VACATION',
            entity_type: 'VACATION',
            entity_id: id,
            metadata: {},
            success: true
        });

        // Send Notification to Creator
        await sendVacationNotification('COMPLETED', {
            userName: creator?.name || 'Cliente',
            recipientEmail: creator?.email,
            companyName: company.nome,
            cnpj: company.cnpj,
            employeeName: employee.name,
            senderEmail: session.email
        });

        revalidatePath('/admin/vacations');
        revalidatePath('/app/vacations');
        return { success: true };

    } catch (error) {
        console.error('Approve Vacation Error:', error);
        return { error: 'Erro ao aprovar férias.' };
    }
}
