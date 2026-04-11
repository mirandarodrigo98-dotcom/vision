'use server';

import db from '@/lib/db';
import { getDigisacConfig, sendDigisacMessage } from '@/app/actions/integrations/digisac';

export async function sendTicketDigisacNotification({
    userId,
    ticketTitle,
    requesterName,
    type,
    customText
}: {
    userId: string;
    ticketTitle: string;
    requesterName: string;
    type: 'abertura' | 'movimentacao' | 'devolucao' | 'finalizacao';
    customText?: string;
}) {
    try {
        const user = (await db.query(`SELECT name, phone, receive_ticket_messages FROM users WHERE id = $1`, [userId])).rows[0] as any;
        
        if (!user || !user.receive_ticket_messages || !user.phone) {
            return { success: false, error: 'Usuário não configurado para receber mensagens ou sem telefone' };
        }

        const config = await getDigisacConfig();
        if (!config || !config.is_active || !config.api_token || !config.connection_phone) {
            return { success: false, error: 'Integração Digisac inativa' };
        }

        let messageBody = '';
        
        if (type === 'abertura') {
            messageBody = `Olá ${user.name}, foi aberto um chamado para você pelo usuário ${requesterName}. Verifique na Central de Chamados.\n\nChamado: *${ticketTitle}*`;
        } else if (type === 'movimentacao') {
            messageBody = `Olá ${user.name}, há uma nova mensagem no chamado *${ticketTitle}* enviada por ${requesterName}:\n\n"${customText}"\n\nVerifique na Central de Chamados.`;
        } else if (type === 'devolucao') {
            messageBody = `Olá ${user.name}, o chamado *${ticketTitle}* foi devolvido por ${requesterName} pelo motivo:\n\n"${customText}"\n\nVerifique na Central de Chamados.`;
        } else if (type === 'finalizacao') {
            messageBody = `Olá ${user.name}, o chamado *${ticketTitle}* foi finalizado por ${requesterName}.\n\nVerifique na Central de Chamados.`;
        }

        const result = await sendDigisacMessage({
            number: user.phone,
            serviceId: config.connection_phone,
            body: messageBody,
            origin: 'bot',
            dontOpenTicket: true
        });

        return result;
    } catch (error) {
        console.error('Error sending ticket digisac notification:', error);
        return { success: false, error: 'Erro interno ao enviar notificação' };
    }
}
