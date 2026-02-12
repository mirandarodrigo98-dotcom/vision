'use server';

import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { sendAdmissionNotification } from '@/lib/emails/notifications';
import { format } from 'date-fns';
import { uploadToR2, getR2DownloadLink } from '@/lib/r2';
import { generateAdmissionPDF } from '@/lib/pdf-generator';

export async function createAdmission(formData: FormData) {
    const session = await getSession();
    if (!session || session.role !== 'client_user') {
        return { error: 'Unauthorized' };
    }

    try {
        const fileKey = formData.get('file_key') as string;
        const file = formData.get('file') as File;
        
        let originalName = '';
        
        if (fileKey) {
             originalName = formData.get('original_file_name') as string;
             if (!originalName) return { error: 'Nome do arquivo original não fornecido.' };
        } else {
            if (!file || file.size === 0) {
                return { error: 'Arquivo obrigatório (.zip ou .rar)' };
            }

            // Validate file size (50MB Limit)
            const MAX_SIZE = 50 * 1024 * 1024; // 50MB
            if (file.size > MAX_SIZE) {
                return { error: 'O arquivo excede o limite máximo de 50MB.' };
            }
            originalName = file.name;
        }

        // Validate file extension
        const ext = path.extname(originalName).toLowerCase();
        if (ext !== '.zip' && ext !== '.rar') {
            return { error: 'Apenas arquivos .zip ou .rar são permitidos.' };
        }

        const employeeFullName = formData.get('employee_full_name') as string;
        const educationLevel = formData.get('education_level') as string;
        const admissionDate = formData.get('admission_date') as string;
        const jobRole = formData.get('job_role') as string;
        const salaryCents = parseInt(formData.get('salary_cents') as string || '0');
        const workSchedule = formData.get('work_schedule') as string;
        const hasVt = formData.get('has_vt') === 'true' ? 1 : 0;
        const vtTarifaCents = hasVt ? parseInt(formData.get('vt_tarifa_cents') as string || '0') : 0;
        const vtLinha = hasVt ? formData.get('vt_linha') as string : null;
        const vtQtdPorDia = hasVt ? parseInt(formData.get('vt_qtd_por_dia') as string || '0') : 0;
        const hasAdv = formData.get('has_adv') === 'true' ? 1 : 0;
        const advDay = hasAdv ? parseInt(formData.get('adv_day') as string || '0') : null;
        const advPeriodicity = hasAdv ? formData.get('adv_periodicity') as string : null;
        const trial1Days = parseInt(formData.get('trial1_days') as string || '0');
        const trial2Days = parseInt(formData.get('trial2_days') as string || '0');
        const generalObservations = formData.get('general_observations') as string;

        // Extra fields for PDF
        const cpf = formData.get('cpf') as string || '';
        const birthDate = formData.get('birth_date') as string || '';
        const email = formData.get('email') as string || '';
        const phone = formData.get('phone') as string || '';
        const maritalStatus = formData.get('marital_status') as string || '';
        const gender = formData.get('gender') as string || '';
        const raceColor = formData.get('race_color') as string || '';
        const contractType = formData.get('contract_type') as string || '';

        // Generate Protocol Number
        const dateStr = format(new Date(), 'yyyyMMdd');
        // Generate 8 digits random sequence
        const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
        const protocolNumber = `${dateStr}${randomPart}`;

        // Get and validate user company
        const companyId = formData.get('company_id') as string;
        if (!companyId) return { error: 'Empresa é obrigatória' };

        const userCompanyData = await db.prepare(`
            SELECT cc.id, cc.nome, cc.cnpj 
            FROM client_companies cc
            JOIN user_companies uc ON uc.company_id = cc.id
            WHERE uc.user_id = ? AND cc.id = ?
        `).get(session.user_id, companyId) as { id: string, nome: string, cnpj: string };

        if (!userCompanyData) return { error: 'Você não tem permissão para esta empresa' };

        // Get User Info
        const userData = await db.prepare('SELECT name, email FROM users WHERE id = ?').get(session.user_id) as { name: string, email: string };
        
        // Get Settings
        const destEmail = (await db.prepare("SELECT value FROM settings WHERE key = 'NZD_DEST_EMAIL'").get() as { value: string })?.value;
        const emailSubject = (await db.prepare("SELECT value FROM settings WHERE key = 'EMAIL_SUBJECT'").get() as { value: string })?.value;
        const emailBody = (await db.prepare("SELECT value FROM settings WHERE key = 'EMAIL_BODY'").get() as { value: string })?.value;

        // Save Admission to DB
        const admissionId = randomUUID();
        await db.prepare(`
            INSERT INTO admission_requests (
                id, company_id, created_by_user_id, employee_full_name, education_level, 
                admission_date, job_role, salary_cents, work_schedule, has_vt, 
                vt_tarifa_cents, vt_linha, vt_qtd_por_dia, has_adv, adv_day, 
                adv_periodicity, trial1_days, trial2_days, general_observations, status, protocol_number, 
                cpf, birth_date, mother_name, email, phone, marital_status, gender, race_color,
                zip_code, address_street, address_number, address_complement, address_neighborhood,
                address_city, address_state, cbo, contract_type,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, 
                      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
            admissionId, userCompanyData.id, session.user_id, employeeFullName, educationLevel,
            admissionDate, jobRole, salaryCents, workSchedule, hasVt,
            vtTarifaCents, vtLinha, vtQtdPorDia, hasAdv, advDay,
            advPeriodicity, trial1Days, trial2Days, generalObservations, protocolNumber,
            cpf, birthDate, motherName, email, phone, maritalStatus, gender, raceColor,
            zipCode, addressStreet, addressNumber, addressComplement, addressNeighborhood,
            addressCity, addressState, cbo, contractType
        );

        // Prepare File Handling
        let fileName = '';
        let fileType = '';
        let fileSize = 0;
        
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        let saveLocalPromise = Promise.resolve();
        let r2Promise: Promise<{ downloadLink: string; fileKey: string } | null> = Promise.resolve(null);

        if (fileKey) {
            // Client-side upload
            fileName = fileKey;
            fileType = formData.get('file_type') as string;
            fileSize = parseInt(formData.get('file_size') as string || '0');
            
            r2Promise = (async () => {
                try {
                    const link = await getR2DownloadLink(fileName);
                    return { downloadLink: link, fileKey: fileName };
                } catch (e) {
                    console.error('Failed to generate download link:', e);
                    return null;
                }
            })();
        } else {
            // Server-side upload fallback
            const fileBuffer = Buffer.from(await file.arrayBuffer());
            fileName = `${protocolNumber}-${file.name}`;
            fileType = file.type;
            fileSize = file.size;
            
            const filePath = path.join(uploadDir, fileName);

            // 1. Local Save (Non-blocking failure)
            saveLocalPromise = (async () => {
                try {
                    await mkdir(uploadDir, { recursive: true });
                    await writeFile(filePath, fileBuffer);
                } catch (e) {
                    console.error('Local save failed:', e);
                }
            })();

            // 2. R2 Upload
            r2Promise = uploadToR2(fileBuffer, fileName, fileType)
                .catch(error => {
                    console.error('R2 Upload Failed:', error);
                    return null;
                });
        }

        // 3. Generate PDF
        const pdfData = {
            protocol_number: protocolNumber,
            employee_full_name: employeeFullName,
            cpf, birth_date: birthDate, email, phone,
            marital_status: maritalStatus, gender, education_level: educationLevel, race_color: raceColor,
            job_role: jobRole, admission_date: admissionDate,
            salary_cents: salaryCents,
            contract_type: contractType,
            trial1_days: trial1Days, trial2_days: trial2Days,
            work_schedule: workSchedule,
            has_vt: hasVt, 
            vt_tarifa_cents: vtTarifaCents,
            vt_linha: vtLinha, vt_qtd_por_dia: vtQtdPorDia,
            has_adv: hasAdv, 
            adv_day: advDay, adv_periodicity: advPeriodicity,
            general_observations: generalObservations
        };

        const pdfPromise = generateAdmissionPDF(pdfData)
            .catch(error => {
                console.error('PDF Generation Failed:', error);
                return Buffer.from('Erro ao gerar relatório PDF'); 
            });

        // Save Attachment Metadata (DB is fast, do it now)
        await db.prepare(`
            INSERT INTO admission_attachments (
                id, admission_id, original_name, mime_type, size_bytes, storage_path, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
            randomUUID(), admissionId, originalName, fileType, fileSize, fileName
        );

        // Await Parallel Tasks
        // We must await all tasks because in Serverless environments (Vercel), 
        // background tasks may be killed immediately after response is sent.
        // Parallel execution still provides performance benefits over sequential.
        const [_, r2Result, pdfBuffer] = await Promise.all([
            saveLocalPromise, 
            r2Promise, 
            pdfPromise
        ]);

        const downloadLink = r2Result?.downloadLink || null;

        // Send Email
        const user = await db.prepare(`SELECT name, email FROM users WHERE id = ?`).get(session.user_id) as any;
        
        let emailSuccess = false;
        if (pdfBuffer) {
            const emailResult = await sendAdmissionNotification('NEW', {
                companyName: userCompanyData.nome,
                cnpj: userCompanyData.cnpj,
                userName: user?.name || session.name || 'Usuário',
                senderEmail: user?.email || session.email,
                employeeName: employeeFullName,
                admissionDate: format(new Date(admissionDate), 'dd/MM/yyyy'),
                pdfBuffer: pdfBuffer,
                downloadLink: downloadLink || undefined
            });
            
            // Check if email was sent successfully (Resend returns data object with id)
            emailSuccess = !!emailResult?.data?.id;

            if (emailResult.error) {
                 console.warn('Email sending failed:', emailResult.error);
            }
        }

        // Audit Log
        logAudit({
            action: 'CREATE_ADMISSION',
            actor_user_id: session.user_id,
            actor_email: userData.email || session.user_id,
            role: 'client_user',
            entity_type: 'admission_request',
            entity_id: admissionId,
            metadata: { protocolNumber, employeeFullName, status: 'submitted' },
            success: true
        });

        revalidatePath('/app');
        
        return { 
            success: true, 
            protocolNumber, 
            downloadLink,
            r2Success: !!r2Result,
            emailSuccess
        };

    } catch (e: any) {
        console.error('Create Admission Error:', e);
        logAudit({
            action: 'CREATE_ADMISSION_ERROR',
            actor_user_id: session.user_id,
            actor_email: session.user_id, 
            role: 'client_user',
            entity_type: 'admission_request',
            metadata: { error: e.message },
            success: false,
        });
        return { error: 'Erro interno ao processar admissão.' };
    }
}

export async function cancelAdmission(admissionId: string) {
    const session = await getSession();
    if (!session || (session.role !== 'client_user' && session.role !== 'admin')) {
        return { error: 'Unauthorized' };
    }

    try {
        const admission = await db.prepare('SELECT * FROM admission_requests WHERE id = ?').get(admissionId) as any;
        
        if (!admission) {
            return { error: 'Admissão não encontrada.' };
        }

        if (session.role === 'client_user') {
            // Check company access
            const hasAccess = await db.prepare(`
                SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
            `).get(session.user_id, admission.company_id);
            
            if (!hasAccess && admission.created_by_user_id !== session.user_id) {
                return { error: 'Você não tem permissão para cancelar esta admissão.' };
            }
        }

        // Check date constraint: Must be at least 1 day before admission date
        const dateStr = admission.admission_date.includes('T') ? admission.admission_date : admission.admission_date + 'T00:00:00';
        const admissionDate = new Date(dateStr);
        const deadline = new Date(admissionDate);
        deadline.setDate(deadline.getDate() - 1);
        
        // Reset time parts for accurate date comparison
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        deadline.setHours(0, 0, 0, 0);

        // Cancel is allowed even if expired, as long as it's not completed
        // if (session.role !== 'admin' && now > deadline) {
        //    return { error: 'O prazo para cancelamento expirou (até 1 dia antes da admissão).' };
        // }

        await db.prepare("UPDATE admission_requests SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(admissionId);

        // Send Email (Cancellation)
        const userCompany = await db.prepare('SELECT nome, cnpj FROM client_companies WHERE id = ?').get(admission.company_id) as any;
        const user = await db.prepare('SELECT name FROM users WHERE id = ?').get(session.user_id) as any;
        const userName = user?.name || session.name || 'Usuário';

        let notifType: 'CANCEL' | 'CANCEL_BY_ADMIN' = 'CANCEL';
        let recipientEmail: string | undefined = undefined;

        if (session.role === 'admin' || session.role === 'operator') {
            notifType = 'CANCEL_BY_ADMIN';
            const creator = await db.prepare('SELECT email FROM users WHERE id = ?').get(admission.created_by_user_id) as { email: string };
            recipientEmail = creator?.email;
        }

        await sendAdmissionNotification(notifType, {
            companyName: userCompany.nome,
            cnpj: userCompany.cnpj,
            userName: userName,
            employeeName: admission.employee_full_name,
            recipientEmail,
            senderEmail: session.email
        });

        logAudit({
            action: 'CANCEL_ADMISSION',
            actor_user_id: session.user_id,
            actor_email: session.user_id,
            role: session.role,
            entity_type: 'admission_request',
            entity_id: admissionId,
            metadata: { protocolNumber: admission.protocol_number },
            success: true
        });

        revalidatePath('/app');
        revalidatePath('/admin/admissions');
        return { success: true };
    } catch (e: any) {
        console.error('Cancel Admission Error:', e);
        return { error: 'Erro ao cancelar admissão.' };
    }
}

export async function updateAdmission(formData: FormData) {
    const session = await getSession();
    if (!session || (session.role !== 'client_user' && session.role !== 'admin')) {
        return { error: 'Unauthorized' };
    }

    try {
        const admissionId = formData.get('admission_id') as string;
        if (!admissionId) return { error: 'ID da admissão obrigatório.' };

        const existingAdmission = await db.prepare('SELECT * FROM admission_requests WHERE id = ?').get(admissionId) as any;
        if (!existingAdmission) return { error: 'Admissão não encontrada.' };

        if (session.role === 'client_user') {
            // Check company access
            const hasAccess = await db.prepare(`
                SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
            `).get(session.user_id, existingAdmission.company_id);

            if (!hasAccess && existingAdmission.created_by_user_id !== session.user_id) {
                 return { error: 'Você não tem permissão para editar esta admissão.' };
            }
        }

        // Check date constraint
        const dateStr = existingAdmission.admission_date.includes('T') ? existingAdmission.admission_date : existingAdmission.admission_date + 'T00:00:00';
        const admissionDateObj = new Date(dateStr);
        const deadline = new Date(admissionDateObj);
        deadline.setDate(deadline.getDate() - 1);
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        deadline.setHours(0, 0, 0, 0);

        if (session.role !== 'admin' && now > deadline) {
            return { error: 'O prazo para retificação expirou (até 1 dia antes da admissão).' };
        }

        // Extract fields
        const educationLevel = formData.get('education_level') as string;
        const admissionDate = formData.get('admission_date') as string;
        const jobRole = formData.get('job_role') as string;
        const salaryCents = parseInt(formData.get('salary_cents') as string || '0');
        const workSchedule = formData.get('work_schedule') as string;
        const hasVt = formData.get('has_vt') === 'true' ? 1 : 0;
        const vtTarifaCents = hasVt ? parseInt(formData.get('vt_tarifa_cents') as string || '0') : 0;
        const vtLinha = hasVt ? formData.get('vt_linha') as string : null;
        const vtQtdPorDia = hasVt ? parseInt(formData.get('vt_qtd_por_dia') as string || '0') : 0;
        const hasAdv = formData.get('has_adv') === 'true' ? 1 : 0;
        const advDay = hasAdv ? parseInt(formData.get('adv_day') as string || '0') : null;
        const advPeriodicity = hasAdv ? formData.get('adv_periodicity') as string : null;
        const trial1Days = parseInt(formData.get('trial1_days') as string || '0');
        const trial2Days = parseInt(formData.get('trial2_days') as string || '0');
        const generalObservations = formData.get('general_observations') as string;

        // Extra fields
        const cpf = formData.get('cpf') as string || '';
        const birthDate = formData.get('birth_date') as string || '';
        const email = formData.get('email') as string || '';
        const phone = formData.get('phone') as string || '';
        const maritalStatus = formData.get('marital_status') as string || '';
        const gender = formData.get('gender') as string || '';
        const raceColor = formData.get('race_color') as string || '';
        const contractType = formData.get('contract_type') as string || '';

        // Change Detection
        const changes: string[] = [];

        // Handle File Upload (Client-side or Server-side)
        const fileKey = formData.get('file_key') as string;
        const file = formData.get('file') as File;
        let r2Result = null;
        let originalName = '';
        let fileName = '';
        let fileType = '';
        let fileSize = 0;
        let r2Promise: Promise<{ downloadLink: string; fileKey: string } | null> | null = null;

        if (fileKey) {
             // Client-side upload
             fileName = fileKey;
             originalName = formData.get('original_file_name') as string;
             fileType = formData.get('file_type') as string;
             fileSize = parseInt(formData.get('file_size') as string || '0');
             
             if (originalName) {
                 r2Promise = (async () => {
                    try {
                        const link = await getR2DownloadLink(fileName);
                        return { downloadLink: link, fileKey: fileName };
                    } catch (e) {
                        console.error('Failed to generate download link:', e);
                        return null;
                    }
                })();
             }
        } else if (file && file.size > 0) {
             // Server-side upload fallback
             const fileBuffer = Buffer.from(await file.arrayBuffer());
             fileName = `${existingAdmission.protocol_number}-${file.name}`;
             fileType = file.type;
             fileSize = file.size;
             originalName = file.name;

             r2Promise = uploadToR2(fileBuffer, fileName, fileType);
        }

        if (r2Promise) {
            try {
                r2Result = await r2Promise;
                if (r2Result) {
                     await db.prepare(`
                        INSERT INTO admission_attachments (
                            id, admission_id, original_name, mime_type, size_bytes, storage_path, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    `).run(
                        randomUUID(), admissionId, originalName, fileType, fileSize, fileName
                    );
                    changes.push('file_attachment');
                }
            } catch (e) {
                console.error('File upload failed during update:', e);
                // We don't block update if upload fails, but we should warn? 
                // For now just log.
            }
        }

        const normalize = (val: any) => val === null || val === undefined ? '' : String(val).trim();
        const normalizeBool = (val: any) => Boolean(val);
        
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

        if (normalize(existingAdmission.education_level) !== normalize(educationLevel)) changes.push('education_level');
        if (!areDatesEqual(existingAdmission.admission_date, admissionDate)) changes.push('admission_date');
        if (normalize(existingAdmission.job_role) !== normalize(jobRole)) changes.push('job_role');
        if (existingAdmission.salary_cents !== salaryCents) changes.push('salary_cents');
        if (normalize(existingAdmission.work_schedule) !== normalize(workSchedule)) changes.push('work_schedule');
        
        if (normalizeBool(existingAdmission.has_vt) !== normalizeBool(hasVt)) changes.push('has_vt');
        if (hasVt) {
             if (existingAdmission.vt_tarifa_cents !== vtTarifaCents) changes.push('vt_tarifa_cents');
             if (normalize(existingAdmission.vt_linha) !== normalize(vtLinha)) changes.push('vt_linha');
             if (existingAdmission.vt_qtd_por_dia !== vtQtdPorDia) changes.push('vt_qtd_por_dia');
        }

        if (normalizeBool(existingAdmission.has_adv) !== normalizeBool(hasAdv)) changes.push('has_adv');
        if (hasAdv) {
             if (existingAdmission.adv_day !== advDay) changes.push('adv_day');
             if (normalize(existingAdmission.adv_periodicity) !== normalize(advPeriodicity)) changes.push('adv_periodicity');
        }

        if (existingAdmission.trial1_days !== trial1Days) changes.push('trial1_days');
        if (existingAdmission.trial2_days !== trial2Days) changes.push('trial2_days');
        if (normalize(existingAdmission.general_observations) !== normalize(generalObservations)) changes.push('general_observations');
        
        if (normalize(existingAdmission.cpf) !== normalize(cpf)) changes.push('cpf');
        if (!areDatesEqual(existingAdmission.birth_date, birthDate)) changes.push('birth_date');
        if (normalize(existingAdmission.email) !== normalize(email)) changes.push('email');
        if (normalize(existingAdmission.phone) !== normalize(phone)) changes.push('phone');
        if (normalize(existingAdmission.marital_status) !== normalize(maritalStatus)) changes.push('marital_status');
        if (normalize(existingAdmission.gender) !== normalize(gender)) changes.push('gender');
        if (normalize(existingAdmission.race_color) !== normalize(raceColor)) changes.push('race_color');
        
        if (normalize(existingAdmission.contract_type) !== normalize(contractType)) changes.push('contract_type');

        await db.prepare(`
            UPDATE admission_requests SET
                education_level = ?, admission_date = ?, job_role = ?, salary_cents = ?, work_schedule = ?,
                has_vt = ?, vt_tarifa_cents = ?, vt_linha = ?, vt_qtd_por_dia = ?,
                has_adv = ?, adv_day = ?, adv_periodicity = ?,
                trial1_days = ?, trial2_days = ?, general_observations = ?,
                cpf = ?, birth_date = ?, email = ?, phone = ?, marital_status = ?, gender = ?, race_color = ?,
                contract_type = ?,
                status = 'RECTIFIED',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            educationLevel, admissionDate, jobRole, salaryCents, workSchedule,
            hasVt, vtTarifaCents, vtLinha, vtQtdPorDia,
            hasAdv, advDay, advPeriodicity,
            trial1Days, trial2Days, generalObservations,
            cpf, birthDate, email, phone, maritalStatus, gender, raceColor,
            contractType,
            admissionId
        );

        logAudit({
            action: 'UPDATE_ADMISSION',
            actor_user_id: session.user_id,
            actor_email: session.email,
            role: session.role,
            entity_type: 'admission_request',
            entity_id: admissionId,
            metadata: { changes, protocolNumber: existingAdmission.protocol_number },
            success: true
        });

        // Send Email (Rectification)
        const userCompany = await db.prepare('SELECT nome, cnpj FROM client_companies WHERE id = ?').get(existingAdmission.company_id) as any;
        const user = await db.prepare('SELECT name FROM users WHERE id = ?').get(session.user_id) as any;
        
        // Generate Updated PDF
        const pdfData = {
            protocol_number: existingAdmission.protocol_number,
            employee_full_name: existingAdmission.employee_full_name,
            cpf, birth_date: birthDate, email, phone,
            marital_status: maritalStatus, gender, education_level: educationLevel, race_color: raceColor,
            job_role: jobRole, admission_date: admissionDate,
            salary_cents: salaryCents,
            contract_type: contractType,
            trial1_days: trial1Days, trial2_days: trial2Days,
            work_schedule: workSchedule,
            has_vt: hasVt, 
            vt_tarifa_cents: vtTarifaCents,
            vt_linha: vtLinha, vt_qtd_por_dia: vtQtdPorDia,
            has_adv: hasAdv, 
            adv_day: advDay, adv_periodicity: advPeriodicity,
            general_observations: generalObservations,
            changes // Pass changes to highlight in PDF if supported
        };

        let pdfBuffer: Buffer;
        try {
            pdfBuffer = await generateAdmissionPDF(pdfData);
        } catch (error) {
            console.error('PDF Generation Failed:', error);
            pdfBuffer = Buffer.from('Erro ao gerar relatório PDF'); 
        }

        await sendAdmissionNotification('UPDATE', {
            companyName: userCompany.nome,
            cnpj: userCompany.cnpj,
            userName: user?.name || session.name || 'Usuário',
            employeeName: existingAdmission.employee_full_name,
            admissionDate: format(new Date(admissionDate), 'dd/MM/yyyy'),
            pdfBuffer: pdfBuffer,
            changes,
            senderEmail: session.email
        });

        revalidatePath('/app/admissions');
        revalidatePath('/admin/admissions');
        return { success: true };
    } catch (e: any) {
        console.error('Update Admission Error:', e);
        return { error: 'Erro ao atualizar admissão.' };
    }
}

export async function completeAdmission(admissionId: string, data?: { employeeCode: string; esocialRegistration: string }) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
        return { error: 'Unauthorized' };
    }

    if (!data?.employeeCode || !data?.esocialRegistration) {
        return { error: 'Código do funcionário e matrícula eSocial são obrigatórios.' };
    }

    try {
        const admission = await db.prepare('SELECT * FROM admission_requests WHERE id = ?').get(admissionId) as any;
        
        if (!admission) {
            return { error: 'Admissão não encontrada.' };
        }

        if (admission.status === 'COMPLETED') {
            return { error: 'Admissão já concluída.' };
        }

        // Check for duplicates (Employee Code and eSocial Registration) within the same company
        const duplicateCheck = await db.prepare(`
            SELECT code, esocial_registration 
            FROM employees 
            WHERE company_id = ? AND (code = ? OR esocial_registration = ?)
        `).get(admission.company_id, data.employeeCode, data.esocialRegistration) as { code: string; esocial_registration: string } | undefined;

        if (duplicateCheck) {
            if (duplicateCheck.code === data.employeeCode) {
                return { error: `O Código do Funcionário "${data.employeeCode}" já existe nesta empresa. Por favor, utilize outro código.` };
            }
            if (duplicateCheck.esocial_registration === data.esocialRegistration) {
                return { error: `A Matrícula eSocial "${data.esocialRegistration}" já existe nesta empresa. Por favor, utilize outra matrícula.` };
            }
        }

        // Get creator info for email
        const creator = await db.prepare('SELECT email, name FROM users WHERE id = ?').get(admission.created_by_user_id) as { email: string, name: string };
        
        // Transaction to create employee and update admission
        const txn = db.transaction(async () => {
            // 1. Create Employee
            // Note: Mapping limited fields available in admission_requests to employees table
            const employeeId = randomUUID();
            // Check if status column exists or if we should use default
            await db.prepare(`
                INSERT INTO employees (
                    id, company_id, name, admission_date, birth_date, cpf, 
                    code, esocial_registration,
                    is_active, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'Admitido', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `).run(
                employeeId, 
                admission.company_id, 
                admission.employee_full_name, 
                admission.admission_date, 
                admission.birth_date, 
                admission.cpf,
                data.employeeCode,
                data.esocialRegistration
            );

            // 2. Update Admission Status
            await db.prepare("UPDATE admission_requests SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(admissionId);
        });
        
        await txn();

        // 3. Send Email to Client
        const userCompany = await db.prepare('SELECT nome, cnpj FROM client_companies WHERE id = ?').get(admission.company_id) as any;
        
        await sendAdmissionNotification('COMPLETED', {
            companyName: userCompany.nome,
            cnpj: userCompany.cnpj,
            userName: creator?.name || 'Cliente',
            employeeName: admission.employee_full_name,
            recipientEmail: creator?.email, // Send to the creator
            senderEmail: session.email
        });

        // 4. Audit Log
        logAudit({
            action: 'APPROVE_ADMISSION',
            actor_user_id: session.user_id,
            actor_email: session.user_id,
            role: session.role,
            entity_type: 'admission_request',
            entity_id: admissionId,
            metadata: { protocolNumber: admission.protocol_number },
            success: true
        });

        revalidatePath('/app');
        revalidatePath('/admin/admissions');
        revalidatePath('/admin/employees'); // Update employees list
        
        return { success: true };
    } catch (e: any) {
        console.error('Approve Admission Error:', e);
        return { error: 'Erro ao aprovar admissão.' };
    }
}
