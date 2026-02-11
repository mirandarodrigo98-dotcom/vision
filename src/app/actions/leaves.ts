'use server';

import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { sendLeaveNotification } from '@/lib/emails/notifications';
import { generateLeavePDF } from '@/lib/pdf-generator';
import { uploadToR2, getR2DownloadLink } from '@/lib/r2';

// Helper to generate Protocol Number
function generateProtocolNumber() {
    const dateStr = format(new Date(), 'yyyyMMdd');
    const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `${dateStr}${randomPart}`;
}

import { checkPendingRequests } from './employees';

export async function createLeave(formData: FormData) {
    const session = await getSession();
    if (!session || session.role !== 'client_user') {
        return { error: 'Unauthorized' };
    }

    try {
        const companyId = formData.get('company_id') as string;
        const employeeId = formData.get('employee_id') as string;
        const startDate = formData.get('start_date') as string;
        const type = formData.get('type') as string;
        const observations = formData.get('observations') as string;
        const attachmentFile = formData.get('attachment') as File;

        if (!companyId || !employeeId || !startDate || !type) {
            return { error: 'Campos obrigatórios faltando.' };
        }

        // Validate company access
        const userCompanyData = await db.prepare(`
            SELECT cc.id, cc.nome, cc.cnpj 
            FROM client_companies cc
            JOIN user_companies uc ON uc.company_id = cc.id
            WHERE uc.user_id = ? AND cc.id = ?
        `).get(session.user_id, companyId) as { id: string, nome: string, cnpj: string };

        if (!userCompanyData) {
            return { error: 'Você não tem permissão para esta empresa.' };
        }

        // Validate employee exists and belongs to company
        const employee = await db.prepare('SELECT id, name FROM employees WHERE id = ? AND company_id = ?').get(employeeId, companyId) as { id: string, name: string };
        
        if (!employee) {
             return { error: 'Funcionário não encontrado.' };
        }

        // Check pending requests
        const pending = await checkPendingRequests(employee.id);
        if (pending) {
            return { error: `Este funcionário já possui uma solicitação de ${pending.type} em andamento.` };
        }

        // Handle File Upload
        let attachmentKey = null;
        let downloadLink = '';
        if (attachmentFile && attachmentFile.size > 0) {
            if (attachmentFile.size > 10 * 1024 * 1024) { // 10MB
                return { error: 'O arquivo deve ter no máximo 10MB.' };
            }

            const allowedTypes = ['application/pdf', 'application/zip', 'application/x-rar-compressed', 'application/vnd.rar', 'image/png', 'image/jpeg'];
            if (!allowedTypes.includes(attachmentFile.type)) {
                // Relaxed check for RAR as mime types can vary
                if (!attachmentFile.name.toLowerCase().endsWith('.rar') && !allowedTypes.includes(attachmentFile.type)) {
                     return { error: 'Tipo de arquivo inválido. Apenas PDF, ZIP, RAR, PNG e JPG são permitidos.' };
                }
            }

            const buffer = Buffer.from(await attachmentFile.arrayBuffer());
            const ext = attachmentFile.name.split('.').pop();
            const fileName = `leaves/${randomUUID()}.${ext}`;
            
            const uploadResult = await uploadToR2(buffer, fileName, attachmentFile.type);
            if (uploadResult) {
                attachmentKey = uploadResult.fileKey;
                downloadLink = uploadResult.downloadLink;
            } else {
                return { error: 'Erro ao fazer upload do arquivo.' };
            }
        }

        const protocolNumber = generateProtocolNumber();
        const leaveId = randomUUID();

        await db.prepare(`
            INSERT INTO leaves (
                id, company_id, employee_id, start_date, type, 
                observations, attachment_key, status, protocol_number, 
                created_by_user_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
            leaveId, companyId, employeeId, startDate, type, 
            observations, attachmentKey, protocolNumber, session.user_id
        );

        // Audit Log
        logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'CREATE_LEAVE',
            entity_type: 'LEAVE_REQUEST',
            entity_id: leaveId,
            metadata: { protocolNumber, companyId, employeeId, type },
            success: true
        });

        const pdfBytes = await generateLeavePDF({
            company_name: userCompanyData.nome,
            employee_name: employee.name,
            type: type,
            start_date: startDate,
            observations: observations,
            protocol_number: protocolNumber
        });
        const pdfBuffer = Buffer.from(pdfBytes);

        await sendLeaveNotification('NEW', {
            userName: session.name || session.email,
            companyName: userCompanyData.nome,
            cnpj: userCompanyData.cnpj,
            employeeName: employee.name,
            leaveType: type,
            startDate: format(new Date(startDate), 'dd/MM/yyyy'),
            observation: observations,
            senderEmail: session.email,
            pdfBuffer,
            downloadLink: downloadLink || undefined
        });

        revalidatePath('/app/leaves');
        return { success: true, id: leaveId, protocol_number: protocolNumber };

    } catch (error) {
        console.error('Create Leave Error:', error);
        return { error: 'Erro ao criar solicitação de afastamento.' };
    }
}

export async function updateLeave(id: string, formData: FormData) {
    const session = await getSession();
    if (!session) {
        return { error: 'Unauthorized' };
    }
    if (session.role !== 'client_user' && session.role !== 'admin') {
         return { error: 'Unauthorized' };
    }

    try {
        const leave = await db.prepare('SELECT * FROM leaves WHERE id = ?').get(id) as any;
        if (!leave) return { error: 'Afastamento não encontrado.' };

        if (session.role === 'client_user') {
            const hasAccess = await db.prepare(`
                SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
            `).get(session.user_id, leave.company_id);

            if (!hasAccess && leave.created_by_user_id !== session.user_id) {
                return { error: 'Sem permissão.' };
            }
        }

        const startDate = formData.get('start_date') as string;
        const type = formData.get('type') as string;
        const observations = formData.get('observations') as string;
        const attachmentFile = formData.get('attachment') as File;

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

        if (!areDatesEqual(leave.start_date, startDate)) changes.push('start_date');
        if (normalize(leave.type) !== normalize(type)) changes.push('type');
        if (normalize(leave.observations) !== normalize(observations)) changes.push('observations');

        let attachmentKey = leave.attachment_key;
        let downloadLink = '';

        // Check if file is being updated
        if (attachmentFile && attachmentFile.size > 0) {
             if (attachmentFile.size > 10 * 1024 * 1024) { // 10MB
                return { error: 'O arquivo deve ter no máximo 10MB.' };
            }

            const allowedTypes = ['application/pdf', 'application/zip', 'application/x-rar-compressed', 'application/vnd.rar', 'image/png', 'image/jpeg'];
             if (!allowedTypes.includes(attachmentFile.type)) {
                if (!attachmentFile.name.toLowerCase().endsWith('.rar') && !allowedTypes.includes(attachmentFile.type)) {
                     return { error: 'Tipo de arquivo inválido. Apenas PDF, ZIP, RAR, PNG e JPG são permitidos.' };
                }
            }

            const buffer = Buffer.from(await attachmentFile.arrayBuffer());
            const ext = attachmentFile.name.split('.').pop();
            const fileName = `leaves/${randomUUID()}.${ext}`;
            
            const uploadResult = await uploadToR2(buffer, fileName, attachmentFile.type);
            if (uploadResult) {
                attachmentKey = uploadResult.fileKey;
                downloadLink = uploadResult.downloadLink;
                changes.push('attachment'); // Mark attachment as changed
            } else {
                return { error: 'Erro ao fazer upload do arquivo.' };
            }
        } else if (attachmentKey) {
            // Get link for existing file if needed
            downloadLink = await getR2DownloadLink(attachmentKey);
        }

        await db.prepare(`
            UPDATE leaves 
            SET start_date = ?, type = ?, observations = ?, attachment_key = ?, status = 'RECTIFIED', updated_at = datetime('now', '-03:00')
            WHERE id = ?
        `).run(startDate, type, observations, attachmentKey, id);

         // Audit Log
         logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'UPDATE_LEAVE',
            entity_type: 'LEAVE_REQUEST',
            entity_id: id,
            metadata: { startDate, type },
            success: true
        });

        // Send Notification
        const company = await db.prepare('SELECT nome, cnpj FROM client_companies WHERE id = ?').get(leave.company_id) as { nome: string, cnpj: string };
        const employee = await db.prepare('SELECT name FROM employees WHERE id = ?').get(leave.employee_id) as { name: string };
        
        const pdfBytes = await generateLeavePDF({
            company_name: company.nome,
            employee_name: employee.name,
            type: type,
            start_date: startDate,
            observations: observations,
            protocol_number: leave.protocol_number,
            changes
        });
        const pdfBuffer = Buffer.from(pdfBytes);

        await sendLeaveNotification('UPDATE', {
            userName: session.name || session.email,
            companyName: company.nome,
            cnpj: company.cnpj,
            employeeName: employee.name,
            leaveType: type,
            startDate: format(new Date(startDate), 'dd/MM/yyyy'),
            observation: observations,
            changes,
            senderEmail: session.email,
            pdfBuffer,
            downloadLink: downloadLink || undefined
        });

        revalidatePath('/app/leaves');
        revalidatePath(`/app/leaves/${id}/edit`);
        return { success: true };

    } catch (error) {
        console.error('Update Leave Error:', error);
        return { error: 'Erro ao atualizar afastamento.' };
    }
}

export async function cancelLeave(id: string) {
    const session = await getSession();
    if (!session) {
        return { error: 'Unauthorized' };
    }
    if (session.role !== 'client_user' && session.role !== 'admin') {
         return { error: 'Unauthorized' };
    }

    try {
        const leave = await db.prepare('SELECT * FROM leaves WHERE id = ?').get(id) as any;
        if (!leave) return { error: 'Afastamento não encontrado.' };

        if (session.role === 'client_user') {
             const hasAccess = await db.prepare(`
                SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
            `).get(session.user_id, leave.company_id);

            if (!hasAccess && leave.created_by_user_id !== session.user_id) {
                return { error: 'Sem permissão.' };
            }
        }

        await db.prepare(`
            UPDATE leaves 
            SET status = 'CANCELLED', updated_at = datetime('now', '-03:00')
            WHERE id = ?
        `).run(id);

        logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'CANCEL_LEAVE',
            entity_type: 'LEAVE_REQUEST',
            entity_id: id,
            metadata: { status: 'CANCELLED' },
            success: true
        });

        // Send Notification
        const company = await db.prepare('SELECT nome, cnpj FROM client_companies WHERE id = ?').get(leave.company_id) as { nome: string, cnpj: string };
        const employee = await db.prepare('SELECT name FROM employees WHERE id = ?').get(leave.employee_id) as { name: string };

        let notifType: 'CANCEL' | 'CANCEL_BY_ADMIN' = 'CANCEL';
        let recipientEmail: string | undefined = undefined;

        if (session.role === 'admin' || session.role === 'operator') {
            notifType = 'CANCEL_BY_ADMIN';
            const creator = await db.prepare('SELECT email FROM users WHERE id = ?').get(leave.created_by_user_id) as { email: string };
            recipientEmail = creator?.email;
        }

        await sendLeaveNotification(notifType, {
            userName: session.name || session.email,
            companyName: company.nome,
            cnpj: company.cnpj,
            employeeName: employee.name,
            leaveType: leave.type,
            startDate: format(new Date(leave.start_date), 'dd/MM/yyyy'),
            observation: '',
            recipientEmail,
            senderEmail: session.email
        });

        revalidatePath('/app/leaves');
        return { success: true };
    } catch (error) {
        console.error('Cancel Leave Error:', error);
        return { error: 'Erro ao cancelar afastamento.' };
    }
}

export async function approveLeave(id: string) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
        return { error: 'Unauthorized' };
    }

    try {
        const leave = await db.prepare('SELECT * FROM leaves WHERE id = ?').get(id) as any;
        if (!leave) return { error: 'Afastamento não encontrado.' };

        if (leave.status !== 'SUBMITTED' && leave.status !== 'RECTIFIED') {
             return { error: 'Apenas solicitações pendentes ou retificadas podem ser aprovadas.' };
        }

        // Get creator info
        const creator = await db.prepare('SELECT email, name FROM users WHERE id = ?').get(leave.created_by_user_id) as { email: string, name: string };
        const company = await db.prepare('SELECT nome, cnpj FROM client_companies WHERE id = ?').get(leave.company_id) as { nome: string, cnpj: string };
        const employee = await db.prepare('SELECT name FROM employees WHERE id = ?').get(leave.employee_id) as { name: string };

        // Update Leave Status
        await db.prepare(`
            UPDATE leaves 
            SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(id);

        logAudit({
            actor_user_id: session.user_id,
            actor_email: session.email,
            action: 'APPROVE_LEAVE',
            entity_type: 'LEAVE_REQUEST',
            entity_id: id,
            metadata: { status: 'COMPLETED' },
            success: true
        });

        // Generate PDF
        const pdfBytes = await generateLeavePDF({
            company_name: company.nome,
            employee_name: employee.name,
            type: leave.type,
            start_date: leave.start_date,
            observations: leave.observations,
            protocol_number: leave.protocol_number
        });
        const pdfBuffer = Buffer.from(pdfBytes);

        // Send Notification to Creator
        await sendLeaveNotification('COMPLETED', {
            userName: creator?.name || 'Cliente',
            recipientEmail: creator?.email,
            companyName: company.nome,
            cnpj: company.cnpj,
            employeeName: employee.name,
            leaveType: leave.type,
            startDate: format(new Date(leave.start_date), 'dd/MM/yyyy'),
            observation: leave.observations,
            senderEmail: session.email,
            pdfBuffer
        });

        revalidatePath('/app/leaves');
        revalidatePath('/admin/leaves');
        return { success: true };

    } catch (error: any) {
        console.error('Approve Leave Error:', error);
        return { error: error.message || 'Erro ao aprovar afastamento.' };
    }
}

export async function getLeaves(companyId?: string) {
    const session = await getSession();
    if (!session) return [];

    let query = `
        SELECT l.*, cc.nome as company_name, e.name as employee_name
        FROM leaves l
        JOIN client_companies cc ON l.company_id = cc.id
        JOIN employees e ON l.employee_id = e.id
    `;
    const params: any[] = [];

    if (session.role === 'client_user') {
        // Filter by companies the user has access to
        query += `
            JOIN user_companies uc ON uc.company_id = l.company_id
            WHERE uc.user_id = ?
        `;
        params.push(session.user_id);

        if (companyId) {
            query += ` AND l.company_id = ?`;
            params.push(companyId);
        }
    } else if (session.role === 'admin' || session.role === 'operator') {
        if (companyId) {
            query += ` WHERE l.company_id = ?`;
            params.push(companyId);
        }
    }

    query += ` ORDER BY l.created_at DESC`;

    return await db.prepare(query).all(...params);
}

export async function getLeave(id: string) {
    const session = await getSession();
    if (!session) return null;

    const leave = await db.prepare(`
        SELECT l.*, cc.nome as company_name, e.name as employee_name
        FROM leaves l
        JOIN client_companies cc ON l.company_id = cc.id
        JOIN employees e ON l.employee_id = e.id
        WHERE l.id = ?
    `).get(id) as any;

    if (!leave) return null;

    // Check permissions
    if (session.role === 'client_user') {
         const hasAccess = await db.prepare(`
            SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
        `).get(session.user_id, leave.company_id);

        if (!hasAccess && leave.created_by_user_id !== session.user_id) {
            return null;
        }
    }

    if (leave.attachment_key) {
        try {
            leave.downloadLink = await getR2DownloadLink(leave.attachment_key);
        } catch (e) {
            console.error('Error generating download link for leave:', e);
            leave.downloadLink = null;
        }
    }

    return leave;
}
