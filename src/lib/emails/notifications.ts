import { Resend } from 'resend';
import db from '@/lib/db';
import { format } from 'date-fns';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';

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
    employeeName: string;
    admissionDate?: string;
    pdfBuffer?: Buffer;
    downloadLink?: string;
    changes?: string[];
}

export async function sendAdmissionNotification(type: 'NEW' | 'UPDATE' | 'CANCEL', data: AdmissionEmailData) {
    const to = await getDestEmail();
    if (!to) {
        console.warn('Email destination not configured (NZD_DEST_EMAIL).');
        return { success: false, error: 'Destination email not configured' };
    }

    let subject = '';
    let html = '';
    const attachments: any[] = [];

    if (type === 'NEW') {
        subject = 'Nova Admissão Solicitada';
        html = `
            <p>Você está recebendo uma solicitação de admissão da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong>.</p>
            <p>A data de admissão é <strong>“${data.admissionDate}”</strong>. Confira a documentação e relatório anexados.</p>
            ${data.downloadLink ? `<p><a href="${data.downloadLink}">Baixar Documentos</a></p>` : ''}
        `;
        if (data.pdfBuffer) {
            attachments.push({ filename: 'Relatorio_Admissao.pdf', content: data.pdfBuffer });
        }
    } else if (type === 'UPDATE') {
        subject = `Admissão de “${data.employeeName}” foi retificada.`;
        html = `
            <p>Você está recebendo uma retificação de admissão da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong>.</p>
            <p>Confira as alterações no relatório anexo.</p>
            ${data.downloadLink ? `<p><a href="${data.downloadLink}">Baixar Documentos (se houver novos)</a></p>` : ''}
        `;
        if (data.pdfBuffer) {
            attachments.push({ filename: 'Relatorio_Admissao_Retificado.pdf', content: data.pdfBuffer });
        }
    } else if (type === 'CANCEL') {
        subject = `Solicitação de Admissão de “${data.employeeName}” foi cancelada.`;
        html = `
            <p>A solicitação de admissão de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong> foi <strong style="color: red;">CANCELADA</strong>.</p>
        `;
    }

    return await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: `<div style="font-family: Arial, sans-serif;">${html}</div>`,
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
}

export async function sendTransferNotification(type: 'NEW' | 'UPDATE' | 'CANCEL', data: TransferEmailData) {
    const to = await getDestEmail();
    if (!to) return { success: false, error: 'Destination email not configured' };

    let subject = '';
    let html = '';

    if (type === 'NEW') {
        subject = 'Nova Solicitação de Transferência Solicitada';
        html = `
            <p>Uma nova solicitação de transferência foi solicitada pelo usuário <strong>"${data.userName}"</strong>.</p>
            <p><strong>ORIGEM:</strong> "${data.sourceCompany}"</p>
            <p><strong>DESTINO:</strong> "${data.targetCompany}"</p>
            <p><strong>FUNCIONÁRIO:</strong> "${data.employeeName}"</p>
            <p><strong>DATA DE TRANSFERENCIA:</strong> "${data.transferDate}"</p>
            <p><strong>OBSERVAÇÃO:</strong> "${data.observation}"</p>
        `;
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
        `;
    } else if (type === 'CANCEL') {
        subject = `Cancelamento de Transferência “${data.employeeName}” foi solicitada.`;
        html = `
            <p>A solicitação de transferência de <strong>“${data.employeeName}”</strong> para a empresa <strong>“${data.targetCompany}”</strong> foi <strong style="color: red;">CANCELADA</strong> pelo usuário <strong>“${data.userName}”</strong>.</p>
        `;
    }

    return await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: `<div style="font-family: Arial, sans-serif;">${html}</div>`
    });
}

// --- VACATION ---

interface VacationEmailData {
    companyName: string;
    cnpj: string;
    userName: string;
    employeeName: string;
    pdfBuffer?: Buffer;
}

export async function sendVacationNotification(type: 'NEW' | 'UPDATE' | 'CANCEL', data: VacationEmailData) {
    const to = await getDestEmail();
    if (!to) return { success: false, error: 'Destination email not configured' };

    let subject = '';
    let html = '';
    const attachments: any[] = [];

    if (type === 'NEW') {
        subject = 'Nova Solicitação de Férias';
        html = `
            <p>Você está recebendo uma solicitação de Férias da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong>.</p>
            <p>Confira o Relatório Anexado.</p>
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
            <p>A solicitação Férias de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong> foi <strong style="color: red;">CANCELADA</strong>.</p>
        `;
    }

    return await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: `<div style="font-family: Arial, sans-serif;">${html}</div>`,
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
}

export async function sendDismissalNotification(type: 'NEW' | 'UPDATE' | 'CANCEL', data: DismissalEmailData) {
    const to = await getDestEmail();
    if (!to) return { success: false, error: 'Destination email not configured' };

    let subject = '';
    let html = '';
    const attachments: any[] = [];

    if (type === 'NEW') {
        subject = 'Nova Solicitação de Demissão';
        html = `
            <p>Você está recebendo uma solicitação de Demissão da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong>.</p>
            <p>Confira o Relatório Anexado.</p>
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
            <p>A solicitação de Rescisão de <strong>“${data.employeeName}”</strong> da empresa <strong>“${data.companyName}”</strong>, CNPJ <strong>“${data.cnpj}”</strong> enviada pelo usuário <strong>“${data.userName}”</strong> foi <strong style="color: red;">CANCELADA</strong>.</p>
        `;
    }

    return await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html: `<div style="font-family: Arial, sans-serif;">${html}</div>`,
        attachments
    });
}
