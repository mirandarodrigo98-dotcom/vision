import { Resend } from 'resend';
import { logAudit } from '@/lib/audit';

export async function sendEmail({
    to,
    subject,
    html,
    category,
    metadata
}: {
    to: string | string[];
    subject: string;
    html: string;
    category: string;
    metadata?: any;
}) {
    // If no API key, log and return mock success (for dev)
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not set. Email would be sent to:', to);
        // Log attempt anyway
        logAudit({
            action: 'SEND_EMAIL_MOCK',
            actor_email: 'system',
            role: 'system',
            entity_type: 'email',
            metadata: { to, subject, category, ...metadata },
            success: true
        });
        return { success: true, id: 'mock-id' };
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'VISION <naoresponda@nzdcontabilidade.com.br>',
            to,
            subject,
            html,
        });

        if (error) {
            console.error('Resend Error:', error);
            logAudit({
                action: 'SEND_EMAIL_ERROR',
                actor_email: 'system',
                role: 'system',
                entity_type: 'email',
                metadata: { error, to, subject, category, ...metadata },
                success: false,
                error_message: error.message
            });
            return { success: false, error };
        }

        logAudit({
            action: 'SEND_EMAIL_SUCCESS',
            actor_email: 'system',
            role: 'system',
            entity_type: 'email',
            entity_id: data?.id,
            metadata: { to, subject, category, ...metadata },
            success: true
        });

        return { success: true, id: data?.id };
    } catch (e: any) {
        console.error('Email Send Exception:', e);
        logAudit({
            action: 'SEND_EMAIL_EXCEPTION',
            actor_email: 'system',
            role: 'system',
            entity_type: 'email',
            metadata: { error: e.message, to, subject, category, ...metadata },
            success: false,
            error_message: e.message
        });
        return { success: false, error: e.message };
    }
}
