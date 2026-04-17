'use server';

import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';
import { sendTransferNotification } from '@/lib/emails/notifications';
import { generateTransferPDF } from '@/lib/pdf-generator';

// Helper to generate Protocol Number
function generateProtocolNumber() {
    const dateStr = format(new Date(), 'yyyyMMdd');
    const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `${dateStr}${randomPart}`;
}

import { checkPendingRequests } from './employees';

export async function createTransfer(formData: FormData) {
    const session = await getSession();
    if (!session || (session.role !== 'client_user' && session.role !== 'operator' && session.role !== 'admin')) {
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

        // Validate source company access and status
        let userCompanyData;

        if (session.role === 'client_user') {
            userCompanyData = (await db.query(`
                SELECT cc.id, COALESCE(cc.razao_social, cc.nome) as nome, cc.cnpj, cc.is_active
                FROM client_companies cc
                JOIN user_companies uc ON uc.company_id = cc.id
                WHERE uc.user_id = $1 AND cc.id = $2
            `, [session.user_id, sourceCompanyId])).rows[0] as { id: string, nome: string, cnpj: string, is_active: number };
        } else if (session.role === 'operator') {
            // Operator: Check if company exists and is NOT restricted
            const isRestricted = (await db.query(`
                SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2
            `, [session.user_id, sourceCompanyId])).rows[0];

            if (isRestricted) {
                return { error: 'Você não tem permissão para esta empresa de origem.' };
            }

            userCompanyData = (await db.query(`
                SELECT id, COALESCE(razao_social, nome) as nome, cnpj, is_active FROM client_companies WHERE id = $1
            `, [sourceCompanyId])).rows[0] as { id: string, nome: string, cnpj: string, is_active: number };
        } else {
            // Admin: Check if company exists
            userCompanyData = (await db.query(`
                SELECT id, COALESCE(razao_social, nome) as nome, cnpj, is_active FROM client_companies WHERE id = $1
            `, [sourceCompanyId])).rows[0] as { id: string, nome: string, cnpj: string, is_active: number };
        }

        if (!userCompanyData) {
            return { error: 'Você não tem permissão para esta empresa de origem ou ela não existe.' };
        }

        if (!userCompanyData.is_active) {
            return { error: 'A empresa de origem está inativa e não pode realizar movimentações.' };
        }

        // Attempt to find employee ID by name and company to check pending requests
        const employee = (await db.query(`SELECT id FROM employees WHERE name = $1 AND company_id = $2`, [employeeName, sourceCompanyId])).rows[0] as { id: string };
        
        if (employee) {
            const pending = await checkPendingRequests(employee.id);
            if (pending) {
                return { error: `Este funcionário já possui uma solicitação de ${pending.type} em andamento.` };
            }
        } else {
             // Fallback or error if employee not found? 
             // Ideally we should require employee to exist.
             return { error: 'Funcionário não encontrado na empresa de origem.' };
        }

        // Validate target company exists, is active (and get name for redundancy/legacy)
        const targetCompany = (await db.query(`SELECT COALESCE(razao_social, nome) as nome, is_active FROM client_companies WHERE id = $1`, [targetCompanyId])).rows[0] as { nome: string, is_active: number };
        if (!targetCompany) {
             return { error: 'Empresa destino inválida.' };
        }
        if (!targetCompany.is_active) {
             return { error: 'A empresa de destino está inativa e não pode receber movimentações.' };
        }

        const protocolNumber = generateProtocolNumber();
        const transferId = randomUUID();

        await db.query(`
            INSERT INTO transfer_requests (
                id, source_company_id, target_company_id, target_company_name, employee_name, 
                transfer_date, observations, status, protocol_number, 
                created_by_user_id, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'SUBMITTED', $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [transferId, sourceCompanyId, targetCompanyId, targetCompany.nome, employeeName, transferDate, observations, protocolNumber, session.user_id]);

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
        
        const pdfBytes = await generateTransferPDF({
            source_company_name: userCompanyData.nome,
            target_company_name: targetCompany.nome,
            employee_name: employeeName,
            transfer_date: transferDate,
            observations: observations,
            protocol_number: protocolNumber
        });
        const pdfBuffer = Buffer.from(pdfBytes);

        await sendTransferNotification('NEW', {
            userName: session.name || session.email,
            sourceCompany: userCompanyData.nome,
            targetCompany: targetCompany.nome,
            employeeName,
            transferDate: format(new Date(transferDate), 'dd/MM/yyyy'),
            observation: observations,
            senderEmail: session.email,
            pdfBuffer
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
    if (session.role !== 'client_user' && session.role !== 'admin' && session.role !== 'operator') {
         return { error: 'Unauthorized' };
    }

    try {
        const transfer = (await db.query(`SELECT * FROM transfer_requests WHERE id = $1`, [id])).rows[0] as any;
        if (!transfer) return { error: 'Transferência não encontrada.' };

        // Validate permission (creator or company access?)
        // Usually company access is better.
        if (session.role === 'client_user') {
            const hasAccess = (await db.query(`
                SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2
            `, [session.user_id, transfer.source_company_id])).rows[0];

            if (!hasAccess && transfer.created_by_user_id !== session.user_id) {
                return { error: 'Sem permissão.' };
            }
        } else if (session.role === 'operator') {
             const isRestricted = (await db.query(`
                SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2
            `, [session.user_id, transfer.source_company_id])).rows[0];

            if (isRestricted) {
                return { error: 'Você não tem permissão para esta empresa.' };
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
        const targetCompany = (await db.query(`SELECT COALESCE(razao_social, nome) as nome FROM client_companies WHERE id = $1`, [targetCompanyId])).rows[0] as { nome: string };
        if (!targetCompany) {
             return { error: 'Empresa destino inválida.' };
        }

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

        if (normalize(transfer.target_company_id) !== normalize(targetCompanyId)) changes.push('target_company_id');
        if (!areDatesEqual(transfer.transfer_date, transferDate)) changes.push('transfer_date');
        if (normalize(transfer.observations) !== normalize(observations)) changes.push('observation');

        await db.query(`
            UPDATE transfer_requests 
            SET target_company_id = $1, target_company_name = $2, transfer_date = $3, observations = $4, status = 'RECTIFIED', updated_at = (NOW() - INTERVAL '3 hours')
            WHERE id = $5
        `, [targetCompanyId, targetCompany.nome, transferDate, observations, id]);

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
        const sourceCompany = (await db.query(`SELECT nome FROM client_companies WHERE id = $1`, [transfer.source_company_id])).rows[0] as { nome: string };
        
        const pdfBytes = await generateTransferPDF({
            source_company_name: sourceCompany.nome,
            target_company_name: targetCompany.nome,
            employee_name: transfer.employee_name,
            transfer_date: transferDate,
            observations: observations,
            protocol_number: transfer.protocol_number,
            changes
        });
        const pdfBuffer = Buffer.from(pdfBytes);

        await sendTransferNotification('UPDATE', {
            userName: session.name || session.email,
            sourceCompany: sourceCompany.nome,
            targetCompany: targetCompany.nome,
            employeeName: transfer.employee_name,
            transferDate: format(new Date(transferDate), 'dd/MM/yyyy'),
            observation: observations,
            changes,
            senderEmail: session.email,
            pdfBuffer
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
    if (session.role !== 'client_user' && session.role !== 'admin' && session.role !== 'operator') {
         return { error: 'Unauthorized' };
    }

    try {
        const transfer = (await db.query(`SELECT * FROM transfer_requests WHERE id = $1`, [id])).rows[0] as any;
        if (!transfer) return { error: 'Transferência não encontrada.' };

        if (session.role === 'client_user') {
             const hasAccess = (await db.query(`
                SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2
            `, [session.user_id, transfer.source_company_id])).rows[0];

            if (!hasAccess && transfer.created_by_user_id !== session.user_id) {
                return { error: 'Sem permissão.' };
            }
        } else if (session.role === 'operator') {
            const isRestricted = (await db.query(`
                SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2
            `, [session.user_id, transfer.source_company_id])).rows[0];

            if (isRestricted) {
                return { error: 'Você não tem permissão para esta empresa.' };
            }
        }

        await db.query(`
            UPDATE transfer_requests 
            SET status = 'CANCELLED', updated_at = (NOW() - INTERVAL '3 hours')
            WHERE id = $1
        `, [id]);

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
        const sourceCompany = (await db.query(`SELECT nome FROM client_companies WHERE id = $1`, [transfer.source_company_id])).rows[0] as { nome: string };

        let notifType: 'CANCEL' | 'CANCEL_BY_ADMIN' = 'CANCEL';
        let recipientEmail: string | undefined = undefined;

        if (session.role === 'admin' || session.role === 'operator') {
            notifType = 'CANCEL_BY_ADMIN';
            const creator = (await db.query(`SELECT email FROM users WHERE id = $1`, [transfer.created_by_user_id])).rows[0] as { email: string };
            recipientEmail = creator?.email;
        }

        await sendTransferNotification(notifType, {
            userName: session.name || session.email,
            sourceCompany: sourceCompany.nome,
            targetCompany: transfer.target_company_name,
            employeeName: transfer.employee_name,
            transferDate: '',
            observation: '',
            recipientEmail,
            senderEmail: session.email
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
        const transfer = (await db.query(`SELECT * FROM transfer_requests WHERE id = $1`, [id])).rows[0] as any;
        if (!transfer) return { error: 'Transferência não encontrada.' };

        if (session.role === 'operator') {
            const isRestricted = (await db.query(`
                SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2
            `, [session.user_id, transfer.source_company_id])).rows[0];

            if (isRestricted) {
                return { error: 'Você não tem permissão para esta empresa.' };
            }
        }

        if (transfer.status !== 'SUBMITTED' && transfer.status !== 'RECTIFIED') {
             return { error: 'Apenas transferências pendentes ou retificadas podem ser aprovadas.' };
        }

        // Get creator info
        const creator = (await db.query(`SELECT email, name FROM users WHERE id = $1`, [transfer.created_by_user_id])).rows[0] as { email: string, name: string };
        const sourceCompany = (await db.query(`SELECT nome FROM client_companies WHERE id = $1`, [transfer.source_company_id])).rows[0] as { nome: string };

        // Transaction to ensure consistency
        const approveTransaction = db.transaction(async () => {
            // 1. Update Transfer Status
            await db.query(`
                UPDATE transfer_requests 
                SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [id]);

            // 2. Find Source Employee
            // Ideally we should have stored employee_id, but name+company is the key used in creation
            const sourceEmployee = (await db.query(`SELECT * FROM employees WHERE name = $1 AND company_id = $2`, [transfer.employee_name, transfer.source_company_id])).rows[0] as any;
            
            if (!sourceEmployee) {
                 throw new Error('Funcionário não encontrado na empresa de origem.');
            }

            // 3. Update Source Employee (Transferido, Inactive)
            // Keep company_id as source company, set status to Transferido, mark as inactive
            await db.query(`
                UPDATE employees 
                SET status = 'Transferido', is_active = 0, transfer_date = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2
            `, [transfer.transfer_date, sourceEmployee.id]);

            // 4. Create Target Employee (Admitido, Active)
            const newEmployeeId = randomUUID();
            
            // We copy most fields, but reset specific ones
            await db.query(`
                INSERT INTO employees (
                    id, company_id, code, employee_code, name, 
                    admission_date, birth_date, gender, pis, cpf, 
                    esocial_registration, is_active, status, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, 
                    $6, $7, $8, $9, $10, 
                    $11, 1, 'Admitido', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            `, [newEmployeeId, transfer.target_company_id, sourceEmployee.code, sourceEmployee.employee_code, sourceEmployee.name, sourceEmployee.admission_date, sourceEmployee.birth_date, sourceEmployee.gender, sourceEmployee.pis, sourceEmployee.cpf, sourceEmployee.esocial_registration]);

            // 5. Copy Vacations
            const vacations = (await db.query(`SELECT * FROM vacations WHERE employee_id = $1`, [sourceEmployee.id])).rows as any[];
            for (const v of vacations) {
                const newVacationId = randomUUID();
                const newProtocol = generateProtocolNumber(); // Generate new protocol to avoid unique constraint violation
                
                await db.query(`
                    INSERT INTO vacations (
                        id, company_id, employee_id, start_date, days_quantity, 
                        allowance_days, return_date, observations, status, 
                        protocol_number, created_by_user_id, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, 
                        $6, $7, $8, $9, 
                        $10, $11, $12, CURRENT_TIMESTAMP
                    )
                `, [newVacationId, transfer.target_company_id, newEmployeeId, v.start_date, v.days_quantity, v.allowance_days, v.return_date, v.observations, v.status, newProtocol, v.created_by_user_id, v.created_at]);
            }

            // 6. Copy Leaves
            const leaves = (await db.query(`SELECT * FROM leaves WHERE employee_id = $1`, [sourceEmployee.id])).rows as any[];
            for (const l of leaves) {
                const newLeaveId = randomUUID();
                // Protocol number in leaves is not unique, but good practice to generate new or keep?
                // If we generate new, we lose the reference to the original request if that matters.
                // But since it's a new company record, a new protocol makes sense.
                // However, "leaves" table doesn't have unique constraint on protocol_number, so we *could* keep it.
                // Let's generate new to be consistent with vacations.
                const newProtocol = generateProtocolNumber(); 

                await db.query(`
                    INSERT INTO leaves (
                        id, company_id, employee_id, start_date, type, 
                        observations, attachment_key, status, protocol_number, 
                        created_by_user_id, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, 
                        $6, $7, $8, $9, 
                        $10, $11, CURRENT_TIMESTAMP
                    )
                `, [newLeaveId, transfer.target_company_id, newEmployeeId, l.start_date, l.type, l.observations, l.attachment_key, l.status, newProtocol, l.created_by_user_id, l.created_at]);
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

        // Generate PDF
        const pdfBytes = await generateTransferPDF({
            source_company_name: sourceCompany.nome,
            target_company_name: transfer.target_company_name,
            employee_name: transfer.employee_name,
            transfer_date: transfer.transfer_date,
            observations: transfer.observations,
            protocol_number: transfer.protocol_number
        });
        const pdfBuffer = Buffer.from(pdfBytes);

        // Send Notification to Creator
        await sendTransferNotification('COMPLETED', {
            userName: creator?.name || 'Cliente',
            recipientEmail: creator?.email,
            sourceCompany: sourceCompany.nome,
            targetCompany: transfer.target_company_name,
            employeeName: transfer.employee_name,
            transferDate: format(new Date(transfer.transfer_date), 'dd/MM/yyyy'),
            observation: transfer.observations,
            senderEmail: session.email,
            pdfBuffer
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
            WHERE uc.user_id = $${params.length + 1}
        `;
        params.push(session.user_id);

        if (companyId) {
            query += ` AND tr.source_company_id = $${params.length + 1}`;
            params.push(companyId);
        }
    } else if (session.role === 'operator') {
        query += ` WHERE (tr.source_company_id IS NULL OR tr.source_company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1))`;
        params.push(session.user_id);

        if (companyId) {
            query += ` AND tr.source_company_id = $${params.length + 1}`;
            params.push(companyId);
        }
    } else if (session.role === 'admin') {
        if (companyId) {
            query += ` WHERE tr.source_company_id = $${params.length + 1}`;
            params.push(companyId);
        }
    }

    query += ` ORDER BY tr.created_at DESC`;

    return (await db.query(query, [...params])).rows;
}

export async function getTransfer(id: string) {
    const session = await getSession();
    if (!session) return null;

    const transfer = (await db.query(`
        SELECT tr.*, 
               COALESCE(cc.razao_social, cc.nome) as source_company_name,
               COALESCE(tc.razao_social, tc.nome, tr.target_company_name) as target_company_name
        FROM transfer_requests tr
        JOIN client_companies cc ON tr.source_company_id = cc.id
        LEFT JOIN client_companies tc ON tr.target_company_id = tc.id
        WHERE tr.id = $1
    `, [id])).rows[0] as any;

    if (!transfer) return null;

    // Check permissions
    if (session.role === 'client_user') {
         const hasAccess = (await db.query(`
            SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2
        `, [session.user_id, transfer.source_company_id])).rows[0];

        if (!hasAccess && transfer.created_by_user_id !== session.user_id) {
            return null;
        }
    } else if (session.role === 'operator') {
        const isRestricted = (await db.query(`
            SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2
        `, [session.user_id, transfer.source_company_id])).rows[0];

        if (isRestricted) {
            return null;
        }
    }

    return transfer;
}
