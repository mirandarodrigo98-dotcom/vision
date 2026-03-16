
import { sendEmail } from '@/lib/email/resend';
import { translateStatus, translatePriority } from '@/lib/ticket-utils';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendTicketCreatedEmail({
  ticket,
  creator,
  assignee
}: {
  ticket: any;
  creator: { name: string; email: string };
  assignee: { name: string; email: string };
}) {
  const subject = `[VISION] Novo Chamado #${ticket.protocol || ticket.id.slice(0, 8)}: ${ticket.title}`;
  const link = `${BASE_URL}/admin/tickets/${ticket.id}`;
  
  const html = `
    <div style="font-family: sans-serif; color: #333;">
      <h2>Novo Chamado Atribuído a Você</h2>
      <p>Olá <strong>${assignee.name}</strong>,</p>
      <p>Um novo chamado foi aberto por <strong>${creator.name}</strong> e atribuído a você.</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Protocolo:</strong> ${ticket.protocol || 'N/A'}</p>
        <p><strong>Título:</strong> ${ticket.title}</p>
        <p><strong>Prioridade:</strong> ${translatePriority(ticket.priority)}</p>
        <p><strong>Categoria:</strong> ${ticket.category}</p>
        ${ticket.due_date ? `<p><strong>Data Limite:</strong> ${new Date(ticket.due_date).toLocaleDateString('pt-BR')}</p>` : ''}
        <p><strong>Descrição:</strong></p>
        <p>${ticket.description}</p>
      </div>

      <p>
        <a href="${link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Ver Chamado
        </a>
      </p>
    </div>
  `;

  await sendEmail({
    to: assignee.email,
    subject,
    html,
    category: 'ticket_created'
  });
}

export async function sendTicketStatusChangedEmail({
  ticket,
  oldStatus,
  newStatus,
  updater,
  recipient
}: {
  ticket: any;
  oldStatus: string;
  newStatus: string;
  updater: { name: string };
  recipient: { name: string; email: string };
}) {
  const subject = `[VISION] Atualização no Chamado #${ticket.protocol || ticket.id.slice(0, 8)}: ${ticket.title}`;
  const link = `${BASE_URL}/admin/tickets/${ticket.id}`;

  const html = `
    <div style="font-family: sans-serif; color: #333;">
      <h2>Chamado Atualizado</h2>
      <p>Olá <strong>${recipient.name}</strong>,</p>
      <p>O status do chamado <strong>${ticket.title}</strong> foi alterado por <strong>${updater.name}</strong>.</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>De:</strong> ${translateStatus(oldStatus)}</p>
        <p><strong>Para:</strong> <strong>${translateStatus(newStatus)}</strong></p>
      </div>

      <p>
        <a href="${link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Ver Chamado
        </a>
      </p>
    </div>
  `;

  await sendEmail({
    to: recipient.email,
    subject,
    html,
    category: 'ticket_status_changed'
  });
}

export async function sendTicketCommentEmail({
  ticket,
  comment,
  author,
  recipient
}: {
  ticket: any;
  comment: string;
  author: { name: string };
  recipient: { name: string; email: string };
}) {
  const subject = `[VISION] Nova Mensagem no Chamado #${ticket.protocol || ticket.id.slice(0, 8)}`;
  const link = `${BASE_URL}/admin/tickets/${ticket.id}`;

  const html = `
    <div style="font-family: sans-serif; color: #333;">
      <h2>Nova Mensagem</h2>
      <p>Olá <strong>${recipient.name}</strong>,</p>
      <p><strong>${author.name}</strong> comentou no chamado <strong>${ticket.title}</strong>:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p>${comment}</p>
      </div>

      <p>
        <a href="${link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Responder
        </a>
      </p>
    </div>
  `;

  await sendEmail({
    to: recipient.email,
    subject,
    html,
    category: 'ticket_comment'
  });
}
