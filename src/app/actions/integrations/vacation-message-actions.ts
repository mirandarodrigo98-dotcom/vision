'use server';

import db from '@/lib/db';
import { getDigisacConfig, sendDigisacMessage } from '@/app/actions/integrations/digisac';

interface EmployeeVacationData {
    nome: string;
    saldoDias: string;
    limitePgto: string;
}

export async function sendVacationNoticeMessage(companyCode: string, employees: EmployeeVacationData[]) {
    try {
        // Buscar a empresa pelo código numérico do Questor
        const paddedCode = companyCode.padStart(4, '0');
        const company = await db.prepare('SELECT id, nome FROM client_companies WHERE code = ? OR code = ?').get(companyCode, paddedCode) as any;
        
        if (!company) {
            return { success: false, error: 'Empresa não encontrada no banco de dados com o código informado.' };
        }

        // Buscar telefone na aba de contatos com categoria "Administrativo"
        const adminPhone = await db.prepare(`
            SELECT p.number 
            FROM company_phones p
            JOIN contact_categories c ON p.category_id = c.id
            WHERE p.company_id = ? AND c.name LIKE '%Administrativo%'
            LIMIT 1
        `).get(company.id) as any;

        if (!adminPhone || !adminPhone.number) {
            return { success: false, error: 'Empresa não possui um contato com a categoria Administrativo cadastrado.' };
        }

        const targetPhone = adminPhone.number;

        // Buscar a configuração do Digisac para pegar o serviceId (connection_phone)
        const config = await getDigisacConfig();
        if (!config || !config.is_active || !config.api_token) {
            return { success: false, error: 'Integração Digisac inativa ou configuração incompleta.' };
        }
        
        if (!config.connection_phone) {
            return { success: false, error: 'Número de conexão do Digisac não configurado no sistema.' };
        }

        // Construir a mensagem
        const employeeListStr = employees.map(emp => `. ${emp.nome} - ${emp.saldoDias} - ${emp.limitePgto}`).join('\n');
        
        const messageBody = `Olá ${company.nome}
Você está recebendo uma informação importante sobre seus colaboradores. Segue abaixo a relação dos colaboradores com saldo de dias e prazo limite para gozo de férias.

${employeeListStr}

Importante saber que isso é apenas um lembrete. É responsabilidade do cliente realizar o controle de vencimento de férias. O relatório completo foi enviado para o portal do cliente.
Em caso de dúvidas entre em contato com nossa equipe atraves do link http://wa.me/552430265648

NZD Contabilidade.`;

        // Chamar sendDigisacMessage
        const result = await sendDigisacMessage({
            number: targetPhone,
            serviceId: config.connection_phone, // assumindo que connection_phone é o serviceId ou number da conexão que o Digisac aceita
            body: messageBody,
            origin: 'bot',
            dontOpenTicket: true
        });

        if (!result.success) {
            return { success: false, error: result.error || 'Falha ao enviar a mensagem pelo Digisac.' };
        }

        return { success: true };
    } catch (error: any) {
        console.error('Error in sendVacationNoticeMessage:', error);
        return { success: false, error: `Erro interno: ${error.message}` };
    }
}
