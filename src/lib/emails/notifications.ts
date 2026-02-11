import { Resend } from 'resend';
import db from '@/lib/db';
import { format } from 'date-fns';
import { readFile } from 'fs/promises';
import { join } from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';

async function getLogoBase64(): Promise<string | null> {
    try {
        const logoSetting = await db.prepare("SELECT value FROM settings WHERE key = 'SYSTEM_LOGO_PATH'").get() as { value: string } | undefined;
        if (!logoSetting?.value) return null;

        const logoPath = join(process.cwd(), 'public', logoSetting.value);
        const buffer = await readFile(logoPath);
        const ext = logoSetting.value.split('.').pop()?.toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png');
        
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch (e) {
        console.error('Error fetching logo for email:', e);
        return null;
    }
}

async function wrapHtml(content: string) {
    const logoSrc = await getLogoBase64();
    const logoHtml = logoSrc 
        ? `<div style="text-align: center; margin-bottom: 24px;"><img src="${logoSrc}" alt="Logo" style="max-width: 300px; max-height: 100px; object-fit: contain;" /></div>`
        : '';

    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        ${logoHtml}
        <div style="color: #333; font-size: 16px; line-height: 1.5;">
          ${content}
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="color: #666; font-size: 12px; text-align: center;">
          Este é um e-mail automático, por favor não responda.
        </p>
      </div>
    `;
}

// Helper to get destination email
async function getDestEmail() {
    const setting = await db.prepare("SELECT value FROM settings WHERE key = 'NZD_DEST_EMAIL'").get() as { value: string };
    return setting?.value;
}

// Helper to highlight changes in HTML
function formatField(label: string, value: string, key: string, changes: string[] = []) {
    const isChanged = changes.includes(key);
    const style = isChanged ? 'background-color: #ffffcc; color: #cc0000; font-weight: bold; padding: 2px 5px;' : '';
    return `<p><strong>${label}:</strong> <span style="${style}">${value}</span></p>`;
}

// --- ADMISSION ---

interface AdmissionEmailData {
    companyName: string;
    cnpj: string;
    userName: string;
    senderEmail?: string; // Email of the user who performed the action
    employeeName: string;
    admissionDate?: string;
    pdfBuffer?: Buffer;
    downloadLink?: string;
    changes?: string[];
    recipientEmail?: string;
}

export async function sendAdmissionNotification(type: 'NEW' | 'UPDATE' | 'CANCEL' | 'COMPLETED' | 'CANCEL_BY_ADMIN', data: AdmissionEmailData) {
    // 1. Determine RECIPIENT based on action type
    // - NEW/UPDATE/CANCEL (Client Actions) -> Admin/Operator (NZD_DEST_EMAIL)
    // - COMPLETED/CANCEL_BY_ADMIN (Admin Actions) -> Client (Creator)
    
    let to = '';
    
    if (type === 'NEW' || type === 'UPDATE' || type === 'CANCEL') {
        // Client actions -> Send to NZD (Admin/Operator)
        to = await getDestEmail() || ''; // Default to NZD email
        
        console.log(`[Email Debug] Type: ${type}, To: ${to}, Sender: ${data.senderEmail}`);

        // SAFETY CHECK: Prevent sending internal notifications to the sender (client)
        if (data.senderEmail && to.trim().toLowerCase() === data.senderEmail.trim().toLowerCase()) {
            console.warn(`Email prevented: Destination (${to}) matches sender (${data.senderEmail}). This notification is for internal team only.`);
            return { success: false, error: 'Destination matches sender - prevented loop' };
        }
    } else {
        // Admin actions -> Send to Client (Creator)
        to = data.recipientEmail || ''; 
    }

    if (!to) {
        console.warn('Email destination not configured (NZD_DEST_EMAIL) or recipientEmail not provided.');
        return { success: false, error: 'Destination email not configured' };
    }

    let subject = '';
    let html = '';
    const attachments: any[] = [];

    // Button Style
    const btnStyle = "display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;";

    if (type === 'NEW') {
        subject = 'Nova Admissão Solicitada';
        html = `
            <p>Você está recebendo uma solicitação de admissão da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong>.</p>
            <p>A data de admissão é <strong>“${data.admissionDate}”</strong>.</p>
            <p>Segue anexado o relatório de admissão bem como o link para download da documentação do funcionário.</p>
            ${data.downloadLink ? `<p><a href="${data.downloadLink}" style="${btnStyle}">Baixar Arquivo Anexo (ZIP/RAR)</a></p>` : '<p style="color: orange;"><em>Link do arquivo anexo não disponível (verifique o armazenamento R2).</em></p>'}
        `;
        if (data.pdfBuffer) {
            attachments.push({ filename: 'Relatorio_Admissao.pdf', content: data.pdfBuffer });
        }
    } else if (type === 'UPDATE') {
        subject = `Admissão de “${data.employeeName}” foi retificada.`;
        html = `
            <p>Você está recebendo uma retificação de admissão da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong>.</p>
            <p>Confira as alterações solicitadas no relatório anexo.</p>
            ${data.downloadLink ? `<p><a href="${data.downloadLink}">Baixar Documentos (se houver novos)</a></p>` : ''}
        `;
        if (data.pdfBuffer) {
            attachments.push({ filename: 'Relatorio_Admissao_Retificado.pdf', content: data.pdfBuffer });
        }
    } else if (type === 'CANCEL') {
        subject = `Solicitação de Admissão de “${data.employeeName}” foi cancelada.`;
        html = `
            <p>A solicitação de admissão de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong> foi CANCELADA.</p>
        `;
    } else if (type === 'CANCEL_BY_ADMIN') {
        subject = `Admissão de “${data.employeeName}” foi cancelada.`;
        html = `
            <p>A solicitação de admissão de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> foi CANCELADA.</p>
            <br/>
            <p>Departamento Pessoal<br>NZD Contabilidade</p>
        `;
    } else if (type === 'COMPLETED') {
        subject = `Admissão de “${data.employeeName}” foi concluída.`;
        html = `
            <p>A solicitação de admissão de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> foi CONCLUÍDA.</p>
            <p>A documentação de admissão bem como as orientações serão enviadas pelo Portal do Cliente.</p>
            <br/>
            <p>Departamento Pessoal<br>NZD Contabilidade</p>
        `;
    }

    return await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: await wrapHtml(html),
        attachments
    });
}

// --- TRANSFER ---

interface TransferEmailData {
    userName: string;
    sourceCompany: string;
    targetCompany: string;
    employeeName: string;
    transferDate: string;
    observation: string;
    changes?: string[]; // Keys: source_company, target_company, employee, transfer_date, observation
    recipientEmail?: string;
    senderEmail?: string;
    pdfBuffer?: Buffer;
}

export async function sendTransferNotification(type: 'NEW' | 'UPDATE' | 'CANCEL' | 'COMPLETED' | 'CANCEL_BY_ADMIN', data: TransferEmailData) {
    let to = '';
    
    if (type === 'NEW' || type === 'UPDATE' || type === 'CANCEL') {
        // Client actions -> Send to NZD (Admin/Operator)
        to = await getDestEmail() || ''; 
        
        console.log(`[Email Debug] Transfer Type: ${type}, To: ${to}, Sender: ${data.senderEmail}`);

        // SAFETY CHECK
        if (data.senderEmail && to.trim().toLowerCase() === data.senderEmail.trim().toLowerCase()) {
            console.warn(`Email prevented: Destination (${to}) matches sender (${data.senderEmail}). This notification is for internal team only.`);
            return { success: false, error: 'Destination matches sender - prevented loop' };
        }
    } else {
        // Admin actions -> Send to Client (Creator)
        to = data.recipientEmail || ''; 
    }

    if (!to) {
        console.warn('Email destination not configured (NZD_DEST_EMAIL) or recipientEmail not provided.');
        return { success: false, error: 'Destination email not configured' };
    }

    let subject = '';
    let html = '';
    const attachments: any[] = [];

    if (type === 'NEW') {
        subject = 'Nova Transferência Solicitada';
        html = `
            <p>Uma nova solicitação de transferência foi solicitada pelo usuário <strong>"${data.userName}"</strong>.</p>
            <p><strong>ORIGEM:</strong> "${data.sourceCompany}"</p>
            <p><strong>DESTINO:</strong> "${data.targetCompany}"</p>
            <p><strong>FUNCIONÁRIO:</strong> "${data.employeeName}"</p>
            <p><strong>DATA DE TRANSFERENCIA:</strong> "${data.transferDate}"</p>
            <p><strong>OBSERVAÇÃO:</strong> "${data.observation}"</p>
            <p>Confira o Relatório Anexo.</p>
        `;
        if (data.pdfBuffer) {
            attachments.push({ filename: 'Relatorio_Transferencia.pdf', content: data.pdfBuffer });
        }
    } else if (type === 'UPDATE') {
        subject = 'Retificação de Transferência Solicitada';
        const changes = data.changes || [];
        html = `
            <p>Uma retificação de transferência foi solicitada pelo usuário <strong>"${data.userName}"</strong>.</p>
            ${formatField('ORIGEM', `"${data.sourceCompany}"`, 'source_company_id', changes)}
            ${formatField('DESTINO', `"${data.targetCompany}"`, 'target_company_id', changes)}
            ${formatField('FUNCIONÁRIO', `"${data.employeeName}"`, 'employee_id', changes)}
            ${formatField('DATA DE TRANSFERENCIA', `"${data.transferDate}"`, 'transfer_date', changes)}
            ${formatField('OBSERVAÇÃO', `"${data.observation}"`, 'observation', changes)}
            <p>Confira as alterações no relatório anexo.</p>
        `;
        if (data.pdfBuffer) {
            attachments.push({ filename: 'Relatorio_Transferencia_Retificado.pdf', content: data.pdfBuffer });
        }
    } else if (type === 'CANCEL') {
        subject = 'Cancelamento de Transferência Solicitada';
        html = `
            <p>A solicitação de transferência de <strong>“${data.employeeName}”</strong> para a empresa <strong>“${data.targetCompany}”</strong> foi CANCELADA pelo usuário <strong>“${data.userName}”</strong>.</p>
        `;
    } else if (type === 'CANCEL_BY_ADMIN') {
        subject = `Cancelamento de Transferência “${data.employeeName}”`;
        html = `
            <p>A solicitação de transferência de <strong>“${data.employeeName}”</strong> para a empresa <strong>“${data.targetCompany}”</strong> foi CANCELADA.</p>
            <br/>
            <p>Departamento Pessoal<br>NZD Contabilidade</p>
        `;
    } else if (type === 'COMPLETED') {
        subject = `Transferência de “${data.employeeName}” foi concluída.`;
        html = `
            <p>A solicitação da transferência de <strong>“${data.employeeName}”</strong> para a empresa <strong>“${data.targetCompany}”</strong> foi CONCLUÍDA.</p>
            <br/>
            <p>Departamento Pessoal<br>NZD Contabilidade</p>
        `;
    }

    return await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: await wrapHtml(html)
    });
}

// --- VACATION ---

interface VacationEmailData {
    companyName: string;
    cnpj: string;
    userName: string;
    employeeName: string;
    pdfBuffer?: Buffer;
    recipientEmail?: string;
    senderEmail?: string;
}

export async function sendVacationNotification(type: 'NEW' | 'UPDATE' | 'CANCEL' | 'COMPLETED' | 'CANCEL_BY_ADMIN', data: VacationEmailData) {
    let to = '';
    
    if (type === 'NEW' || type === 'UPDATE' || type === 'CANCEL') {
        // Client actions -> Send to NZD (Admin/Operator)
        to = await getDestEmail() || ''; 
        
        console.log(`[Email Debug] Vacation Type: ${type}, To: ${to}, Sender: ${data.senderEmail}`);

        // SAFETY CHECK
        if (data.senderEmail && to.trim().toLowerCase() === data.senderEmail.trim().toLowerCase()) {
            console.warn(`Email prevented: Destination (${to}) matches sender (${data.senderEmail}). This notification is for internal team only.`);
            return { success: false, error: 'Destination matches sender - prevented loop' };
        }
    } else {
        // Admin actions -> Send to Client (Creator)
        to = data.recipientEmail || ''; 
    }

    if (!to) {
        console.warn('Email destination not configured (NZD_DEST_EMAIL) or recipientEmail not provided.');
        return { success: false, error: 'Destination email not configured' };
    }

    let subject = '';
    let html = '';
    const attachments: any[] = [];

    if (type === 'NEW') {
        subject = 'Nova Solicitação de Férias';
        html = `
            <p>Você está recebendo uma solicitação de Férias da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong>.</p>
            <p>Confira o Relatório Anexados.</p>
        `;
        if (data.pdfBuffer) attachments.push({ filename: 'Relatorio_Ferias.pdf', content: data.pdfBuffer });
    } else if (type === 'UPDATE') {
        subject = `Solicitação de Férias de “${data.employeeName}” foi retificada.`;
        html = `
            <p>Você está recebendo uma retificação de Férias da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong>.</p>
            <p>Confira as alterações no relatório anexo.</p>
        `;
        if (data.pdfBuffer) attachments.push({ filename: 'Relatorio_Ferias_Retificado.pdf', content: data.pdfBuffer });
    } else if (type === 'CANCEL') {
        subject = `Solicitação Férias de “${data.employeeName}” foi Cancelada`;
        html = `
            <p>A solicitação Férias de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong> foi CANCELADA.</p>
        `;
    } else if (type === 'CANCEL_BY_ADMIN') {
        subject = `Férias de “${data.employeeName}” foi Cancelada`;
        html = `
            <p>A solicitação de Férias de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> foi CANCELADA.</p>
            <br/>
            <p>Departamento Pessoal<br>NZD Contabilidade</p>
        `;
    } else if (type === 'COMPLETED') {
        subject = `Solicitação de Férias de “${data.employeeName}” foi Concluída.`;
        html = `
            <p>A solicitação de Férias de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> foi CONCLUÍDA.</p>
            <p>A documentação será enviada para o Portal do Cliente.</p>
            <br/>
            <p>Departamento Pessoal<br>NZD Contabilidade</p>
        `;
    }

    return await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: await wrapHtml(html),
        attachments
    });
}

interface LeaveEmailData {
    userName: string;
    companyName: string;
    cnpj: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    observation: string;
    changes?: string[];
    recipientEmail?: string;
    senderEmail?: string;
    pdfBuffer?: Buffer;
    downloadLink?: string;
}

export async function sendLeaveNotification(type: 'NEW' | 'UPDATE' | 'CANCEL' | 'COMPLETED' | 'CANCEL_BY_ADMIN', data: LeaveEmailData) {
    let to = '';
    
    if (type === 'NEW' || type === 'UPDATE' || type === 'CANCEL') {
        to = await getDestEmail() || ''; 
        
        console.log(`[Email Debug] Leave Type: ${type}, To: ${to}, Sender: ${data.senderEmail}`);

        if (data.senderEmail && to.trim().toLowerCase() === data.senderEmail.trim().toLowerCase()) {
            console.warn(`Email prevented: Destination (${to}) matches sender (${data.senderEmail}). This notification is for internal team only.`);
            return { success: false, error: 'Destination matches sender - prevented loop' };
        }
    } else {
        to = data.recipientEmail || ''; 
    }

    if (!to) {
        console.warn('Email destination not configured (NZD_DEST_EMAIL) or recipientEmail not provided.');
        return { success: false, error: 'Destination email not configured' };
    }

    let subject = '';
    let html = '';
    const attachments: any[] = [];

    // Button Style
    const btnStyle = "display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;";

    if (type === 'NEW') {
        subject = 'Novo Afastamento Solicitado';
        html = `
            <p>Uma solicitação de afastamento foi solicitada pelo usuário <strong>“${data.userName}”</strong>.</p>
            <p><strong>EMPRESA:</strong> "${data.companyName}"</p>
            <p><strong>CNPJ:</strong> "${data.cnpj}"</p>
            <p><strong>FUNCIONÁRIO:</strong> "${data.employeeName}"</p>
            <p><strong>DATA DO AFASTAMENTO:</strong> "${data.startDate}"</p>
            <p><strong>OBSERVAÇÃO:</strong> "${data.observation}"</p>
            <p>Segue o link para download da documentação do afastamento.</p>
            ${data.downloadLink ? `<p><a href="${data.downloadLink}" style="${btnStyle}">Baixar Documento Anexo</a></p>` : ''}
        `;
        if (data.pdfBuffer) attachments.push({ filename: 'Relatorio_Afastamento.pdf', content: data.pdfBuffer });
    } else if (type === 'UPDATE') {
        subject = `Afastamento de “${data.employeeName}” foi retificado.`;
        const changes = data.changes || [];
        html = `
            <p>Você está recebendo uma retificação de afastamento da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong>.</p>
            <p>Confira as alterações solicitadas abaixo.</p>
            <p><strong>EMPRESA:</strong> "${data.companyName}"</p>
            <p><strong>CNPJ:</strong> "${data.cnpj}"</p>
            ${formatField('FUNCIONÁRIO', `"${data.employeeName}"`, 'employee_id', changes)}
            ${formatField('DATA DO AFASTAMENTO', `"${data.startDate}"`, 'start_date', changes)}
            ${formatField('OBSERVAÇÃO', `"${data.observation}"`, 'observations', changes)}
            ${changes.includes('attachment') ? `
                <p>Segue o link para download da documentação do afastamento.</p>
                ${data.downloadLink ? `<p><a href="${data.downloadLink}">Baixar Documento Atualizado</a></p>` : ''}
            ` : ''}
            <p>Confira as alterações no relatório anexo.</p>
        `;
        if (data.pdfBuffer) attachments.push({ filename: 'Relatorio_Afastamento_Retificado.pdf', content: data.pdfBuffer });
    } else if (type === 'CANCEL') {
        subject = `Solicitação de Afastamento de “${data.employeeName}” foi cancelada.`;
        html = `
            <p>A solicitação de afastamento de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong> foi CANCELADA.</p>
        `;
    } else if (type === 'CANCEL_BY_ADMIN') {
        subject = `Afastamento de “${data.employeeName}” foi cancelada.`;
        html = `
            <p>A solicitação de afastamento de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> foi CANCELADA.</p>
            <br/>
            <p>Departamento Pessoal<br>NZD Contabilidade</p>
        `;
    } else if (type === 'COMPLETED') {
        subject = `Afastamento de “${data.employeeName}” foi concluída.`;
        html = `
            <p>A solicitação de afastamento de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> foi CONCLUÍDA.</p>
            <br/>
            <p>Departamento Pessoal<br>NZD Contabilidade</p>
        `;
    }

    return await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: await wrapHtml(html),
        attachments
    });
}


// --- DISMISSAL ---

interface DismissalEmailData {
    companyName: string;
    cnpj: string;
    userName: string;
    employeeName: string;
    pdfBuffer?: Buffer;
    changes?: string[];
    recipientEmail?: string;
    senderEmail?: string;
}

export async function sendDismissalNotification(type: 'NEW' | 'UPDATE' | 'CANCEL' | 'COMPLETED' | 'CANCEL_BY_ADMIN', data: DismissalEmailData) {
    let to = '';
    
    if (type === 'NEW' || type === 'UPDATE' || type === 'CANCEL') {
        // Client actions -> Send to NZD (Admin/Operator)
        to = await getDestEmail() || ''; 
        
        console.log(`[Email Debug] Dismissal Type: ${type}, To: ${to}, Sender: ${data.senderEmail}`);

        // SAFETY CHECK
        if (data.senderEmail && to.trim().toLowerCase() === data.senderEmail.trim().toLowerCase()) {
            console.warn(`Email prevented: Destination (${to}) matches sender (${data.senderEmail}). This notification is for internal team only.`);
            return { success: false, error: 'Destination matches sender - prevented loop' };
        }
    } else {
        // Admin actions -> Send to Client (Creator)
        to = data.recipientEmail || ''; 
    }

    if (!to) {
        console.warn('Email destination not configured (NZD_DEST_EMAIL) or recipientEmail not provided.');
        return { success: false, error: 'Destination email not configured' };
    }

    let subject = '';
    let html = '';
    const attachments: any[] = [];

    if (type === 'NEW') {
        subject = 'Nova Solicitação de Demissão';
        html = `
            <p>Você está recebendo uma solicitação de Demissão da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong>.</p>
            <p>Confira o Relatório Anexados.</p>
        `;
        if (data.pdfBuffer) attachments.push({ filename: 'Relatorio_Demissao.pdf', content: data.pdfBuffer });
    } else if (type === 'UPDATE') {
        subject = `Solicitação de Demissão de “${data.employeeName}” foi retificada.`;
        html = `
            <p>Você está recebendo uma retificação de Demissão da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong>.</p>
            <p>Confira as alterações no relatório anexo.</p>
        `;
        if (data.pdfBuffer) attachments.push({ filename: 'Relatorio_Demissao_Retificado.pdf', content: data.pdfBuffer });
    } else if (type === 'CANCEL') {
        subject = `Solicitação Demissão de “${data.employeeName}” foi Cancelada`;
        html = `
            <p>A solicitação de Rescisão de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong> foi CANCELADA.</p>
        `;
    } else if (type === 'CANCEL_BY_ADMIN') {
        subject = `Demissão de “${data.employeeName}” foi Cancelada`;
        html = `
            <p>A solicitação de Rescisão de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> foi CANCELADA.</p>
            <br/>
            <p>Departamento Pessoal<br>NZD Contabilidade</p>
        `;
    } else if (type === 'COMPLETED') {
        subject = `Demissão de “${data.employeeName}” foi Concluída`;
        html = `
            <p>A solicitação de Rescisão de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> foi CONCLUÍDA.</p>
            <br/>
            <p>Departamento Pessoal<br>NZD Contabilidade</p>
        `;
    }

    return await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: await wrapHtml(html),
        attachments
    });
}
