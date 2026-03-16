'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createNotification } from '@/app/actions/notifications';
import { sendEmail } from '@/lib/email/resend';
import { uploadToR2, getR2DownloadLink, deleteFromR2 } from '@/lib/r2';
import { getUserPermissions } from '@/app/actions/permissions';
import { hasPermission } from '@/lib/rbac';
import { translateStatus, translatePriority } from '@/lib/ticket-utils';
import { 
  sendTicketCreatedEmail, 
  sendTicketStatusChangedEmail, 
  sendTicketCommentEmail 
} from '@/lib/emails/ticket-notifications';

const TicketSchema = z.object({
  title: z.string()
    .min(1, 'Título é obrigatório')
    .max(30, 'Título deve ter no máximo 30 caracteres'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().min(1, 'Categoria é obrigatória'),
  assignee_id: z.string().min(1, 'Destinatário é obrigatório'),
  due_date: z.string().optional(),
  company_id: z.string().optional(),
});

const CommentSchema = z.object({
  content: z.string().min(1, 'Comentário não pode ser vazio'),
});

async function getUserEmail(userId: string) {
  try {
    const user = await db.prepare('SELECT email, name FROM users WHERE id = ?').get(userId) as any;
    return user;
  } catch (error) {
    return null;
  }
}

async function createTicketsSequencesTable() {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS tickets_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      current_number INTEGER NOT NULL DEFAULT 1,
      UNIQUE(year, month)
    )
  `).run();

  // Ensure protocol column exists in tickets table
  try {
    // Postgres compatible way to ensure column exists
    await db.prepare("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS protocol TEXT").run();
  } catch (e) {
    console.error("Error ensuring protocol column:", e);
    // Fallback for older DBs or if IF NOT EXISTS is not supported
    try {
      await db.prepare("ALTER TABLE tickets ADD COLUMN protocol TEXT").run();
    } catch (e2) {
      // Ignore error if column already exists
    }
  }
}

async function getNextSequentialNumber(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  await createTicketsSequencesTable();

  // Usar transação para garantir atomicidade se possível, mas SQLite em modo WAL deve lidar bem
  // Primeiro tenta pegar o atual
  const sequence = await db.prepare(`
    SELECT current_number FROM tickets_sequences WHERE year = ? AND month = ?
  `).get(year, month) as any;

  let nextNum = 1;
  if (sequence) {
    nextNum = sequence.current_number;
    // Incrementa para o próximo
    await db.prepare(`
      UPDATE tickets_sequences SET current_number = current_number + 1 WHERE year = ? AND month = ?
    `).run(year, month);
  } else {
    // Inicia sequência do mês
    // Próximo será 2, atual é 1
    await db.prepare(`
      INSERT INTO tickets_sequences (year, month, current_number) VALUES (?, ?, 2)
    `).run(year, month);
  }
  
  // Format: AAAAMMDD-XXXX
  const day = String(date.getDate()).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  const seqStr = String(nextNum).padStart(4, '0');
  
  return `${year}${monthStr}${day}-${seqStr}`;
}

export async function createTicket(prevState: any, formData: FormData) {
  const session = await getSession();
  if (!session) {
    return { error: 'Não autenticado' };
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description'),
    priority: formData.get('priority') || 'medium',
    category: formData.get('category'),
    assignee_id: formData.get('assignee_id'),
    due_date: formData.get('due_date') || undefined,
    company_id: formData.get('company_id') || undefined,
  };

  // Ensure empty strings are treated as undefined for optional fields
  if (rawData.due_date === '') rawData.due_date = undefined;
  if (rawData.company_id === '') rawData.company_id = undefined;

  const validatedFields = TicketSchema.safeParse(rawData);

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors;
    console.error('Ticket validation error:', fieldErrors);
    return { error: 'Campos inválidos', details: fieldErrors };
  }

  const { title, description, priority, category, assignee_id, due_date, company_id } = validatedFields.data;
  
  try {
    const ticketId = uuidv4();
    const protocol = await getNextSequentialNumber(new Date());

    // Processar anexos
    const attachments = formData.getAll('attachments') as File[];
    const validAttachments: File[] = [];

    // Validar limites de arquivos
    if (attachments.length > 5) {
      return { error: 'Máximo de 5 arquivos permitidos' };
    }

    for (const file of attachments) {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        return { error: `Arquivo ${file.name} excede o limite de 5MB` };
      }
      if (file.size > 0) {
          validAttachments.push(file);
      }
    }

    await db.prepare(`
      INSERT INTO tickets (id, protocol, title, description, priority, category, requester_id, assignee_id, status, due_date, company_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).run(
      ticketId,
      protocol,
      title,
      description,
      priority,
      category,
      session.user_id,
      assignee_id,
      due_date ? new Date(due_date).toISOString() : null,
      company_id
    );

    // Adicionar registro no histórico
    const interactionId = uuidv4();
    await db.prepare(`
      INSERT INTO ticket_interactions (id, ticket_id, user_id, type, content)
      VALUES (?, ?, ?, 'creation', 'Chamado criado')
    `).run(interactionId, ticketId, session.user_id);

    // Upload de anexos
    for (const file of validAttachments) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileExtension = file.name.split('.').pop();
        const fileName = `tickets/${ticketId}/${uuidv4()}.${fileExtension}`;
        
        const uploadResult = await uploadToR2(buffer, fileName, file.type);
        
        if (uploadResult) {
          await db.prepare(`
            INSERT INTO ticket_attachments (id, ticket_id, file_key, original_name, content_type, size, interaction_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            uuidv4(),
            ticketId,
            uploadResult.fileKey,
            file.name,
            file.type,
            file.size,
            interactionId
          );
        }
      } catch (uploadError) {
        console.error(`Erro ao fazer upload do arquivo ${file.name}:`, uploadError);
        // Não falhar o ticket se um anexo falhar, apenas logar
      }
    }

    // Notificar Assignee se houver
    if (assignee_id) {
      try {
        const assignee = await getUserEmail(assignee_id);
        if (assignee) {
          // Notificação Desktop/App
          await createNotification(
            assignee_id,
            'Novo Chamado Atribuído',
            `Você foi atribuído ao chamado: ${title}`,
            `/admin/tickets/${ticketId}`
          );

          // Email
          const ticketData = {
            id: ticketId,
            protocol,
            title,
            description,
            priority,
            category,
            due_date,
            status: 'open'
          };

          await sendTicketCreatedEmail({
            ticket: ticketData,
            creator: { name: session.name || 'Usuário', email: session.email || '' },
            assignee: { name: assignee.name, email: assignee.email }
          });
        }
      } catch (notifyError) {
         console.error('Error sending notifications:', notifyError);
         // Don't fail ticket creation if notification fails
      }
    }

    revalidatePath('/admin/tickets');
    return { success: true, ticketId };
  } catch (error) {
    console.error('Error creating ticket:', error);
    return { error: `Erro ao criar chamado: ${(error as Error).message}` };
  }
}

export async function returnTicket(ticketId: string, reason: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const ticket = await db.prepare('SELECT assignee_id, requester_id, title FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) return { error: 'Ticket not found' };

    // Only assignee or admin can return
    const permissions = await getUserPermissions();
    const canEdit = permissions.includes('tickets.edit') || permissions.includes('tickets.admin');
    
    if (session.role !== 'admin' && session.user_id !== ticket.assignee_id && !canEdit) {
       return { error: 'Permission denied' };
    }

    await db.prepare(`
      UPDATE tickets 
      SET status = 'returned', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(ticketId);

    // Log interaction
    await db.prepare(`
      INSERT INTO ticket_interactions (id, ticket_id, user_id, type, content)
      VALUES (?, ?, ?, 'status_change', ?)
    `).run(uuidv4(), ticketId, session.user_id, `Chamado devolvido pelo motivo: ${reason}`);

    // Notify requester
    const requester = await getUserEmail(ticket.requester_id);
    if (requester) {
      await createNotification(
        ticket.requester_id,
        'Chamado Devolvido',
        `Seu chamado "${ticket.title}" foi devolvido para ajustes. Motivo: ${reason}`,
        `/admin/tickets/${ticketId}`
      );

      await sendEmail({
        to: requester.email,
        subject: `[VISION] Chamado Devolvido: ${ticket.title}`,
        html: `
          <h2>Olá ${requester.name},</h2>
          <p>Seu chamado foi devolvido para ajustes.</p>
          <p><strong>Status:</strong> ${translateStatus('returned')}</p>
          <p><strong>Motivo:</strong> ${reason}</p>
          <p>Por favor, acesse o chamado, faça os ajustes necessários e clique em "Reenviar".</p>
          <p><a href="https://vision.nzdcontabilidade.com.br/admin/tickets/${ticketId}">Acessar Chamado</a></p>
        `,
        category: 'ticket_returned'
      });
    }
    
    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath('/admin/tickets');
    return { success: true };
  } catch (error) {
    console.error('Error returning ticket:', error);
    return { error: 'Erro ao devolver chamado' };
  }
}

export async function resubmitTicket(ticketId: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const ticket = await db.prepare('SELECT requester_id, assignee_id, title FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) return { error: 'Ticket not found' };

    // Only requester can resubmit
    const permissions = await getUserPermissions();
    const canEdit = permissions.includes('tickets.edit') || permissions.includes('tickets.admin');
    
    if (session.role !== 'admin' && session.user_id !== ticket.requester_id && !canEdit) {
       return { error: 'Permission denied' };
    }

    await db.prepare(`
      UPDATE tickets 
      SET status = 'open', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(ticketId);

    // Log interaction
    await db.prepare(`
      INSERT INTO ticket_interactions (id, ticket_id, user_id, type, content)
      VALUES (?, ?, ?, 'status_change', ?)
    `).run(uuidv4(), ticketId, session.user_id, `Chamado reenviado após ajustes.`);

    // Notify assignee
    if (ticket.assignee_id) {
      const assignee = await getUserEmail(ticket.assignee_id);
      if (assignee) {
        await createNotification(
          ticket.assignee_id,
          'Chamado Reenviado',
          `O chamado "${ticket.title}" foi reenviado pelo solicitante.`,
          `/admin/tickets/${ticketId}`
        );

        await sendEmail({
          to: assignee.email,
          subject: `[VISION] Chamado Reenviado: ${ticket.title}`,
          html: `
            <h2>Olá ${assignee.name},</h2>
            <p>O chamado foi reenviado após ajustes.</p>
            <p><strong>Status:</strong> ${translateStatus('open')}</p>
            <p><a href="https://vision.nzdcontabilidade.com.br/admin/tickets/${ticketId}">Acessar Chamado</a></p>
          `,
          category: 'ticket_resubmitted'
        });
      }
    }
    
    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath('/admin/tickets');
    return { success: true };
  } catch (error) {
    console.error('Error resubmitting ticket:', error);
    return { error: 'Erro ao reenviar chamado' };
  }
}

export async function acceptTicket(ticketId: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const ticket = await db.prepare('SELECT status, assignee_id, requester_id, title, protocol FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) return { error: 'Ticket not found' };

    // Only assignee or admin can accept, OR if it's unassigned (pickup)
    const permissions = await getUserPermissions();
    const canEdit = permissions.includes('tickets.edit') || permissions.includes('tickets.admin');
    const isUnassigned = !ticket.assignee_id;
    
    if (session.role !== 'admin' && session.user_id !== ticket.assignee_id && !canEdit && !isUnassigned) {
       return { error: 'Permission denied' };
    }

    if (ticket.status !== 'open') {
      return { error: 'Ticket must be open to accept' };
    }

    // If unassigned, assign to current user
    let newAssigneeId = ticket.assignee_id;
    if (isUnassigned) {
      newAssigneeId = session.user_id;
      await db.prepare(`
        UPDATE tickets 
        SET status = 'in_progress', assignee_id = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(session.user_id, ticketId);
    } else {
      await db.prepare(`
        UPDATE tickets 
        SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(ticketId);
    }

    // Log interaction
    await db.prepare(`
      INSERT INTO ticket_interactions (id, ticket_id, user_id, type, content)
      VALUES (?, ?, ?, 'status_change', ?)
    `).run(uuidv4(), ticketId, session.user_id, isUnassigned ? 'Chamado aceito e assumido' : 'Chamado aceito e em andamento');

    // Notify requester
    const requester = await getUserEmail(ticket.requester_id);
    if (requester) {
      await createNotification(
        ticket.requester_id,
        'Chamado em Andamento',
        `Seu chamado "${ticket.title}" foi aceito e está em andamento.`,
        `/admin/tickets/${ticketId}`
      );

      await sendTicketStatusChangedEmail({
        ticket,
        oldStatus: 'open',
        newStatus: 'in_progress',
        updater: { name: session.name || 'Atendente' }, // Assuming session has user_name or fetch it
        recipient: { name: requester.name, email: requester.email }
      });
    }

    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath('/admin/tickets');
    return { success: true };
  } catch (error) {
    console.error('Error accepting ticket:', error);
    return { error: 'Erro ao aceitar chamado' };
  }
}

export async function resolveTicket(ticketId: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const ticket = await db.prepare('SELECT status, assignee_id, requester_id, title FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) return { error: 'Ticket not found' };

    // Only assignee or admin can resolve
    const permissions = await getUserPermissions();
    const canEdit = permissions.includes('tickets.edit') || permissions.includes('tickets.admin');
    
    if (session.role !== 'admin' && session.user_id !== ticket.assignee_id && !canEdit) {
       return { error: 'Permission denied' };
    }

    if (ticket.status !== 'in_progress') {
      return { error: 'Ticket must be in progress to resolve' };
    }

    await db.prepare(`
      UPDATE tickets 
      SET status = 'resolved', updated_at = CURRENT_TIMESTAMP, closed_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), ticketId);

    // Log interaction
    await db.prepare(`
      INSERT INTO ticket_interactions (id, ticket_id, user_id, type, content)
      VALUES (?, ?, ?, 'status_change', ?)
    `).run(uuidv4(), ticketId, session.user_id, 'Chamado resolvido');

    // Notify requester
    const requester = await getUserEmail(ticket.requester_id);
    if (requester) {
      await createNotification(
        ticket.requester_id,
        'Chamado Resolvido',
        `Seu chamado "${ticket.title}" foi marcado como resolvido.`,
        `/admin/tickets/${ticketId}`
      );

      await sendEmail({
        to: requester.email,
        subject: `[VISION] Chamado Resolvido: ${ticket.title}`,
        html: `
          <h2>Olá ${requester.name},</h2>
          <p>Seu chamado foi marcado como <strong>${translateStatus('resolved')}</strong>.</p>
          <p><strong>Status:</strong> ${translateStatus('resolved')}</p>
          <p>Se o problema persistir, você pode reabrir o chamado em até 15 dias.</p>
          <p><a href="https://vision.nzdcontabilidade.com.br/admin/tickets/${ticketId}">Acessar Chamado</a></p>
        `,
        category: 'ticket_resolved'
      });
    }

    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath('/admin/tickets');
    return { success: true };
  } catch (error) {
    console.error('Error resolving ticket:', error);
    return { error: 'Erro ao resolver chamado' };
  }
}

export async function reopenTicket(ticketId: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const ticket = await db.prepare('SELECT status, requester_id, closed_at, title, assignee_id FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) return { error: 'Ticket not found' };

    // Only requester or admin can reopen
    const permissions = await getUserPermissions();
    const canEdit = permissions.includes('tickets.edit') || permissions.includes('tickets.admin');
    
    if (session.role !== 'admin' && session.user_id !== ticket.requester_id && !canEdit) {
       return { error: 'Permission denied' };
    }

    if (ticket.status !== 'resolved') {
      return { error: 'Ticket must be resolved to reopen' };
    }

    // Check 15 days limit
    if (ticket.closed_at) {
      const closedDate = new Date(ticket.closed_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - closedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 15) {
        return { error: 'Prazo de 15 dias para reabertura expirado' };
      }
    }

    await db.prepare(`
      UPDATE tickets 
      SET status = 'open', updated_at = CURRENT_TIMESTAMP, closed_at = NULL
      WHERE id = ?
    `).run(ticketId);

    // Log interaction
    await db.prepare(`
      INSERT INTO ticket_interactions (id, ticket_id, user_id, type, content)
      VALUES (?, ?, ?, 'status_change', ?)
    `).run(uuidv4(), ticketId, session.user_id, 'Chamado reaberto pelo solicitante');

    // Notify assignee
    if (ticket.assignee_id) {
      const assignee = await getUserEmail(ticket.assignee_id);
      if (assignee) {
        await createNotification(
          ticket.assignee_id,
          'Chamado Reaberto',
          `O chamado "${ticket.title}" foi reaberto.`,
          `/admin/tickets/${ticketId}`
        );

        await sendEmail({
          to: assignee.email,
          subject: `[VISION] Chamado Reaberto: ${ticket.title}`,
          html: `
            <h2>Olá ${assignee.name},</h2>
            <p>Um chamado resolvido foi reaberto pelo solicitante.</p>
            <p><strong>Status:</strong> ${translateStatus('open')}</p>
            <p><a href="https://vision.nzdcontabilidade.com.br/admin/tickets/${ticketId}">Acessar Chamado</a></p>
          `,
          category: 'ticket_reopened'
        });
      }
    }

    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath('/admin/tickets');
    return { success: true };
  } catch (error) {
    console.error('Error reopening ticket:', error);
    return { error: 'Erro ao reabrir chamado' };
  }
}

export async function cancelTicket(ticketId: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const ticket = await db.prepare('SELECT status, assignee_id, requester_id, title, protocol FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) return { error: 'Ticket not found' };

    // Only assignee or admin can cancel
    const permissions = await getUserPermissions();
    const canEdit = permissions.includes('tickets.edit') || permissions.includes('tickets.admin');
    
    if (session.role !== 'admin' && session.user_id !== ticket.assignee_id && !canEdit) {
       return { error: 'Permission denied' };
    }

    await db.prepare(`
      UPDATE tickets 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP, closed_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), ticketId);

    // Log interaction
    await db.prepare(`
      INSERT INTO ticket_interactions (id, ticket_id, user_id, type, content)
      VALUES (?, ?, ?, 'status_change', ?)
    `).run(uuidv4(), ticketId, session.user_id, 'Chamado cancelado');

    // Notify requester
    const requester = await getUserEmail(ticket.requester_id);
    if (requester) {
      await createNotification(
        ticket.requester_id,
        'Chamado Cancelado',
        `Seu chamado "${ticket.title}" foi cancelado.`,
        `/admin/tickets/${ticketId}`
      );

      await sendTicketStatusChangedEmail({
        ticket,
        oldStatus: ticket.status,
        newStatus: 'cancelled',
        updater: { name: session.name || 'Atendente' },
        recipient: { name: requester.name, email: requester.email }
      });
    }

    // Notify assignee if not the one canceling
    if (ticket.assignee_id && ticket.assignee_id !== session.user_id) {
        const assignee = await getUserEmail(ticket.assignee_id);
        if (assignee) {
             await createNotification(
                ticket.assignee_id,
                'Chamado Cancelado',
                `O chamado "${ticket.title}" foi cancelado.`,
                `/admin/tickets/${ticketId}`
              );

              await sendTicketStatusChangedEmail({
                ticket,
                oldStatus: ticket.status,
                newStatus: 'cancelled',
                updater: { name: session.name || 'Atendente' },
                recipient: { name: assignee.name, email: assignee.email }
              });
        }
    }

    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath('/admin/tickets');
    return { success: true };
  } catch (error) {
    console.error('Error cancelling ticket:', error);
    return { error: 'Erro ao cancelar chamado' };
  }
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const currentTicket = await db.prepare('SELECT status, requester_id, assignee_id, title, protocol FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!currentTicket) return { error: 'Ticket not found' };

    const permissions = await getUserPermissions();
    const canEdit = permissions.includes('tickets.edit') || permissions.includes('tickets.admin');
    const isAssignee = currentTicket.assignee_id === session.user_id;
    const isRequester = currentTicket.requester_id === session.user_id;
    
    if (session.role !== 'admin' && !canEdit && !isAssignee && !isRequester) {
       return { error: 'Permission denied' };
    }

    await db.prepare(`
      UPDATE tickets 
      SET status = ?, updated_at = CURRENT_TIMESTAMP, closed_at = ?
      WHERE id = ?
    `).run(
      status, 
      status === 'closed' || status === 'resolved' ? new Date().toISOString() : null,
      ticketId
    );

    // Log interaction
    await db.prepare(`
      INSERT INTO ticket_interactions (id, ticket_id, user_id, type, content)
      VALUES (?, ?, ?, 'status_change', ?)
    `).run(uuidv4(), ticketId, session.user_id, `Status alterado de ${translateStatus(currentTicket.status)} para ${translateStatus(status)}`);

    // Notificar Requester se fechado/resolvido
    if (status === 'closed' || status === 'resolved') {
      const requester = await getUserEmail(currentTicket.requester_id);
      if (requester) {
        await createNotification(
          currentTicket.requester_id,
          'Chamado Atualizado',
          `Seu chamado "${currentTicket.title}" foi alterado para: ${translateStatus(status)}`,
          `/admin/tickets/${ticketId}`
        );

        await sendTicketStatusChangedEmail({
          ticket: currentTicket,
          oldStatus: currentTicket.status,
          newStatus: status,
          updater: { name: session.name || 'Atendente' },
          recipient: { name: requester.name, email: requester.email }
        });
      }
    }

    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath('/admin/tickets');
    return { success: true };
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return { error: 'Failed to update status' };
  }
}

export async function updateTicketAssignee(ticketId: string, assigneeId: string | null) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const ticketInfo = await db.prepare('SELECT title, assignee_id FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticketInfo) return { error: 'Ticket not found' };

    const permissions = await getUserPermissions();
    const canEdit = permissions.includes('tickets.edit') || permissions.includes('tickets.admin');
    const isUnassigned = !ticketInfo.assignee_id;
    
    // Allow if admin, canEdit, is current assignee, OR ticket is unassigned (pickup)
    if (session.role !== 'admin' && !canEdit && session.user_id !== ticketInfo.assignee_id && !isUnassigned) {
       return { error: 'Permission denied' };
    }

    await db.prepare(`
      UPDATE tickets 
      SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(assigneeId, ticketId);

    // Get assignee name for log
    let logMessage = 'Atribuído a Ninguém';
    if (assigneeId) {
      const assignee = await db.prepare('SELECT name, email FROM users WHERE id = ?').get(assigneeId) as any;
      const assigneeName = assignee?.name || 'Desconhecido';
      logMessage = `Atribuído a ${assigneeName}`;

      // Notify new assignee (if different from old)
      if (assigneeId !== ticketInfo.assignee_id) {
         await createNotification(
          assigneeId,
          'Chamado Atribuído',
          `Você foi atribuído ao chamado: ${ticketInfo.title}`,
          `/admin/tickets/${ticketId}`
        );

        if (assignee?.email) {
          await sendEmail({
            to: assignee.email,
            subject: `[VISION] Chamado Atribuído: ${ticketInfo.title}`,
            html: `
              <h2>Olá ${assigneeName},</h2>
              <p>Um chamado foi atribuído a você.</p>
              <p><strong>Título:</strong> ${ticketInfo.title}</p>
              <p><a href="https://vision.nzdcontabilidade.com.br/admin/tickets/${ticketId}">Clique aqui para ver o chamado</a></p>
            `,
            category: 'ticket_assigned'
          });
        }
      }
    } else {
        logMessage = 'Atribuição removida';
    }

    // Log interaction
    await db.prepare(`
      INSERT INTO ticket_interactions (id, ticket_id, user_id, type, content)
      VALUES (?, ?, ?, 'assignment_change', ?)
    `).run(uuidv4(), ticketId, session.user_id, logMessage);

    revalidatePath(`/admin/tickets/${ticketId}`);
    revalidatePath('/admin/tickets');
    return { success: true };
  } catch (error) {
    console.error('Error updating ticket assignee:', error);
    return { error: 'Failed to update assignee' };
  }
}

export async function addTicketComment(ticketId: string, formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const content = formData.get('content') as string;
  if (!content || !content.trim()) return { error: 'Comentário não pode ser vazio' };

  try {
    const ticket = await db.prepare('SELECT id, requester_id, assignee_id, title, protocol FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) return { error: 'Ticket not found' };

    const interactionId = uuidv4();
    await db.prepare(`
      INSERT INTO ticket_interactions (id, ticket_id, user_id, type, content)
      VALUES (?, ?, ?, 'comment', ?)
    `).run(interactionId, ticketId, session.user_id, content);

    // Processar anexos
    const attachments = formData.getAll('attachments') as File[];
    const validAttachments: File[] = [];

    // Validar limites de arquivos (max 2MB cada)
    for (const file of attachments) {
      if (file.size > 2 * 1024 * 1024) { // 2MB
        return { error: `Arquivo ${file.name} excede o limite de 2MB` };
      }
      if (file.size > 0) {
          validAttachments.push(file);
      }
    }

    // Upload de anexos
    for (const file of validAttachments) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileExtension = file.name.split('.').pop();
        const fileName = `tickets/${ticketId}/comments/${interactionId}/${uuidv4()}.${fileExtension}`;
        
        const uploadResult = await uploadToR2(buffer, fileName, file.type);
        
        if (uploadResult) {
          await db.prepare(`
            INSERT INTO ticket_attachments (id, ticket_id, file_key, original_name, content_type, size, interaction_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            uuidv4(),
            ticketId,
            uploadResult.fileKey,
            file.name,
            file.type,
            file.size,
            interactionId
          );
        }
      } catch (uploadError) {
        console.error(`Erro ao fazer upload do arquivo ${file.name}:`, uploadError);
      }
    }

    await db.prepare(`
      UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(ticketId);

    // Notificações
    const sender = await getUserEmail(session.user_id);
    const senderName = sender?.name || 'Usuário';

    // Se o remetente é o solicitante, notifica o responsável
    if (session.user_id === ticket.requester_id && ticket.assignee_id) {
        const assignee = await getUserEmail(ticket.assignee_id);
        if (assignee) {
            await createNotification(
                ticket.assignee_id,
                'Nova Mensagem',
                `Nova mensagem no chamado "${ticket.title}": ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                `/admin/tickets/${ticketId}`
            );

            await sendTicketCommentEmail({
                ticket,
                comment: content,
                author: { name: senderName },
                recipient: { name: assignee.name, email: assignee.email }
            });
        }
    } 
    // Se o remetente é o responsável, notifica o solicitante
    else if (session.user_id === ticket.assignee_id) {
        const requester = await getUserEmail(ticket.requester_id);
        if (requester) {
             await createNotification(
                ticket.requester_id,
                'Nova Mensagem',
                `Nova mensagem no chamado "${ticket.title}": ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                `/admin/tickets/${ticketId}`
            );

            await sendTicketCommentEmail({
                ticket,
                comment: content,
                author: { name: senderName },
                recipient: { name: requester.name, email: requester.email }
            });
        }
    }
    // Se for um terceiro (ex: admin que não é nem solicitante nem responsável)
    else {
        // Notifica solicitante
        const requester = await getUserEmail(ticket.requester_id);
        if (requester && requester.id !== session.user_id) {
             await createNotification(
                ticket.requester_id,
                'Nova Mensagem',
                `Nova mensagem no chamado "${ticket.title}": ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                `/admin/tickets/${ticketId}`
            );

            await sendTicketCommentEmail({
                ticket,
                comment: content,
                author: { name: senderName },
                recipient: { name: requester.name, email: requester.email }
            });
        }

        // Notifica responsável
        if (ticket.assignee_id && ticket.assignee_id !== session.user_id) {
            const assignee = await getUserEmail(ticket.assignee_id);
            if (assignee) {
                await createNotification(
                    ticket.assignee_id,
                    'Nova Mensagem',
                    `Nova mensagem no chamado "${ticket.title}": ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                    `/admin/tickets/${ticketId}`
                );

                await sendTicketCommentEmail({
                    ticket,
                    comment: content,
                    author: { name: senderName },
                    recipient: { name: assignee.name, email: assignee.email }
                });
            }
        }
    }

    revalidatePath(`/admin/tickets/${ticketId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return { error: 'Failed to add comment: ' + (error?.message || String(error)) };
  }
}

export async function getTickets(filters?: { 
  status?: string; 
  assignee_id?: string; 
  requester_id?: string;
  title?: string;
  department_id?: string;
  startDate?: string;
  endDate?: string;
}) {
  const session = await getSession();
  if (!session) return [];

  // Fetch user's department
  const user = await db.prepare('SELECT department_id FROM users WHERE id = ?').get(session.user_id) as any;
  const userDepartmentId = user?.department_id;

  let query = `
    SELECT t.*, 
      r.name as requester_name, r.email as requester_email,
      rd.name as requester_department_name,
      a.name as assignee_name,
      ad.name as assignee_department_name
    FROM tickets t
    JOIN users r ON t.requester_id = r.id
    LEFT JOIN departments rd ON r.department_id = rd.id
    LEFT JOIN users a ON t.assignee_id = a.id
    LEFT JOIN departments ad ON a.department_id = ad.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Visibility Logic: Admin sees all. Others see created by them, assigned to them, or assigned to their department.
  const canAdmin = await hasPermission(session.role, 'tickets.admin');
  
  if (session.role !== 'admin' && !canAdmin) {
    query += ` AND (
      t.requester_id = ? 
      OR t.assignee_id = ? 
      OR (a.department_id IS NOT NULL AND a.department_id = ?)
    )`;
    params.push(session.user_id, session.user_id, userDepartmentId);
  }

  if (filters?.status && filters.status !== 'all') {
    query += ` AND t.status = ?`;
    params.push(filters.status);
  }

  if (filters?.assignee_id && filters.assignee_id !== 'all') {
    query += ` AND t.assignee_id = ?`;
    params.push(filters.assignee_id);
  }

  if (filters?.requester_id && filters.requester_id !== 'all') {
    query += ` AND t.requester_id = ?`;
    params.push(filters.requester_id);
  }

  if (filters?.title) {
    query += ` AND t.title LIKE ?`;
    params.push(`%${filters.title}%`);
  }

  if (filters?.department_id && filters.department_id !== 'all') {
    query += ` AND r.department_id = ?`;
    params.push(filters.department_id);
  }

  if (filters?.startDate) {
    query += ` AND date(t.created_at) >= date(?)`;
    params.push(filters.startDate);
  }

  if (filters?.endDate) {
    query += ` AND date(t.created_at) <= date(?)`;
    params.push(filters.endDate);
  }

  query += ` ORDER BY t.created_at DESC`;

  try {
    const tickets = await db.prepare(query).all(...params);
    return tickets;
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }
}

export async function getTicketCounts(filters?: { 
  assignee_id?: string; 
  requester_id?: string;
  title?: string;
  department_id?: string;
  startDate?: string;
  endDate?: string;
}) {
  const session = await getSession();
  if (!session) return { total: 0, open: 0, in_progress: 0, closed: 0 };

  // Fetch user's department
  const user = await db.prepare('SELECT department_id FROM users WHERE id = ?').get(session.user_id) as any;
  const userDepartmentId = user?.department_id;

  let query = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN t.status = 'open' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN t.status IN ('closed', 'resolved') THEN 1 ELSE 0 END) as closed
    FROM tickets t
    JOIN users r ON t.requester_id = r.id
    LEFT JOIN departments rd ON r.department_id = rd.id
    LEFT JOIN users a ON t.assignee_id = a.id
    LEFT JOIN departments ad ON a.department_id = ad.id
    WHERE 1=1
  `;
  const params: any[] = [];

  // Visibility Logic: Admin sees all. Others see created by them, assigned to them, or assigned to their department.
  const canAdmin = await hasPermission(session.role, 'tickets.admin');
  
  if (session.role !== 'admin' && !canAdmin) {
    query += ` AND (
      t.requester_id = ? 
      OR t.assignee_id = ? 
      OR (a.department_id IS NOT NULL AND a.department_id = ?)
    )`;
    params.push(session.user_id, session.user_id, userDepartmentId);
  }

  // Filters (excluding status)
  if (filters?.assignee_id && filters.assignee_id !== 'all') {
    query += ` AND t.assignee_id = ?`;
    params.push(filters.assignee_id);
  }

  if (filters?.requester_id && filters.requester_id !== 'all') {
    query += ` AND t.requester_id = ?`;
    params.push(filters.requester_id);
  }

  if (filters?.title) {
    query += ` AND t.title LIKE ?`;
    params.push(`%${filters.title}%`);
  }

  if (filters?.department_id && filters.department_id !== 'all') {
    query += ` AND r.department_id = ?`;
    params.push(filters.department_id);
  }

  if (filters?.startDate) {
    query += ` AND date(t.created_at) >= date(?)`;
    params.push(filters.startDate);
  }

  if (filters?.endDate) {
    query += ` AND date(t.created_at) <= date(?)`;
    params.push(filters.endDate);
  }

  try {
    const result = await db.prepare(query).get(...params) as any;
    return {
      total: result.total || 0,
      open: result.open || 0,
      in_progress: result.in_progress || 0,
      closed: result.closed || 0
    };
  } catch (error) {
    console.error('Error fetching ticket counts:', error);
    return { total: 0, open: 0, in_progress: 0, closed: 0 };
  }
}

export async function getTicketFilterOptions() {
  const session = await getSession();
  if (!session) return { requesters: [], departments: [], assignees: [] };

  try {
    const requesters = await db.prepare(`
      SELECT id, name FROM users WHERE deleted_at IS NULL ORDER BY name ASC
    `).all();

    const departments = await db.prepare(`
      SELECT id, name FROM departments ORDER BY name ASC
    `).all();

    const assignees = await getPotentialAssignees(false);

    return { requesters, departments, assignees };
  } catch (error) {
    console.error('Error fetching ticket filter options:', error);
    return { requesters: [], departments: [], assignees: [] };
  }
}

export async function getTicketById(id: string) {
  const session = await getSession();
  if (!session) return null;

  try {
    const ticket = await db.prepare(`
      SELECT t.*, 
        r.name as requester_name, r.email as requester_email, r.avatar_path as requester_avatar,
        a.name as assignee_name, a.avatar_path as assignee_avatar
      FROM tickets t
      JOIN users r ON t.requester_id = r.id
      LEFT JOIN users a ON t.assignee_id = a.id
      WHERE t.id = ?
    `).get(id);

    if (!ticket) return null;


    const interactions = await db.prepare(`
      SELECT i.*, u.name as user_name, u.avatar_path as user_avatar
      FROM ticket_interactions i
      JOIN users u ON i.user_id = u.id
      WHERE i.ticket_id = ?
      ORDER BY i.created_at ASC
    `).all(id);

    // Get attachments
    const attachmentsRaw = await db.prepare(`
      SELECT * FROM ticket_attachments WHERE ticket_id = ?
    `).all(id) as any[];

    const attachments = await Promise.all(attachmentsRaw.map(async (att) => {
      try {
        const url = await getR2DownloadLink(att.file_key);
        return { ...att, url };
      } catch (e) {
        console.error(`Error generating download link for attachment ${att.id}:`, e);
        return { ...att, url: '#' };
      }
    }));

    // Attach attachments to interactions
    const interactionsWithAttachments = interactions.map((interaction: any) => {
      const interactionAttachments = attachments.filter((att: any) => att.interaction_id === interaction.id);
      return { ...interaction, attachments: interactionAttachments };
    });

    return { ...ticket, interactions: interactionsWithAttachments, attachments };
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    return null;
  }
}

export async function getPotentialAssignees(excludeCurrentUser: boolean = true) {
  const session = await getSession();
  if (!session) return [];

  try {
    // Retorna admins e operadores
    // Exclui o usuário "Admin Inicial" especificamente
    // Define departamento como "Administrador" para admins
    let query = `
      SELECT u.id, u.name, u.email, u.role, 
      CASE 
        WHEN u.role = 'admin' THEN 'Administrador'
        ELSE d.name 
      END as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.role IN ('admin', 'operator') 
      AND u.name != 'Admin Inicial'
      AND u.deleted_at IS NULL
    `;
    
    const params: any[] = [];

    if (excludeCurrentUser) {
      query += ` AND u.id != ?`;
      params.push(session.user_id);
    }

    query += ` ORDER BY u.name ASC`;

    const assignees = await db.prepare(query).all(...params);
    
    return assignees as { id: string; name: string; email: string; role: string; department_name: string }[];
  } catch (error) {
    console.error('Error fetching assignees:', error);
    return [];
  }
}
