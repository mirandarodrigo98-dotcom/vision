'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createNotification } from '@/app/actions/notifications';
import { sendEmail } from '@/lib/email';
import { uploadToR2 } from '@/lib/r2';

const TicketSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string().min(1, 'Categoria é obrigatória'),
  assignee_id: z.string().optional().nullable(),
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
  };

  const validatedFields = TicketSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: 'Campos inválidos', details: validatedFields.error.flatten() };
  }

  const { title, description, priority, category, assignee_id } = validatedFields.data;
  const ticketId = uuidv4();

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

  try {
    await db.prepare(`
      INSERT INTO tickets (id, title, description, priority, category, requester_id, assignee_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
    `).run(
      ticketId,
      title,
      description,
      priority,
      category,
      session.user_id,
      assignee_id || null
    );

    // Upload de anexos
    for (const file of validAttachments) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileExtension = file.name.split('.').pop();
        const fileName = `tickets/${ticketId}/${uuidv4()}.${fileExtension}`;
        
        const uploadResult = await uploadToR2(buffer, fileName, file.type);
        
        if (uploadResult) {
          await db.prepare(`
            INSERT INTO ticket_attachments (id, ticket_id, file_key, original_name, content_type, size)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            uuidv4(),
            ticketId,
            uploadResult.fileKey,
            file.name,
            file.type,
            file.size
          );
        }
      } catch (uploadError) {
        console.error(`Erro ao fazer upload do arquivo ${file.name}:`, uploadError);
        // Não falhar o ticket se um anexo falhar, apenas logar
      }
    }

    // Adicionar registro no histórico
    const interactionId = uuidv4();
    await db.prepare(`
      INSERT INTO ticket_interactions (id, ticket_id, user_id, type, content)
      VALUES (?, ?, ?, 'creation', 'Chamado criado')
    `).run(interactionId, ticketId, session.user_id);

    // Notificar Assignee se houver
    if (assignee_id) {
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
        await sendEmail({
          to: assignee.email,
          subject: `[VISION] Novo Chamado Atribuído: ${title}`,
          html: `
            <h2>Olá ${assignee.name},</h2>
            <p>Um novo chamado foi atribuído a você.</p>
            <p><strong>Título:</strong> ${title}</p>
            <p><strong>Prioridade:</strong> ${priority}</p>
            <p><strong>Categoria:</strong> ${category}</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/tickets/${ticketId}">Clique aqui para ver o chamado</a></p>
          `
        });
      }
    }

    revalidatePath('/admin/tickets');
    return { success: true, ticketId };
  } catch (error) {
    console.error('Error creating ticket:', error);
    return { error: 'Erro ao criar chamado' };
  }
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const currentTicket = await db.prepare('SELECT status, requester_id, title FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!currentTicket) return { error: 'Ticket not found' };

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
    `).run(uuidv4(), ticketId, session.user_id, `Status alterado de ${currentTicket.status} para ${status}`);

    // Notificar Requester se fechado/resolvido
    if (status === 'closed' || status === 'resolved') {
      const requester = await getUserEmail(currentTicket.requester_id);
      if (requester) {
        await createNotification(
          currentTicket.requester_id,
          'Chamado Atualizado',
          `Seu chamado "${currentTicket.title}" foi alterado para: ${status}`,
          `/admin/tickets/${ticketId}`
        );

        await sendEmail({
          to: requester.email,
          subject: `[VISION] Chamado Atualizado: ${currentTicket.title}`,
          html: `
            <h2>Olá ${requester.name},</h2>
            <p>O status do seu chamado foi atualizado.</p>
            <p><strong>Chamado:</strong> ${currentTicket.title}</p>
            <p><strong>Novo Status:</strong> ${status}</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/tickets/${ticketId}">Clique aqui para ver o chamado</a></p>
          `
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
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/tickets/${ticketId}">Clique aqui para ver o chamado</a></p>
            `
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

export async function addTicketComment(ticketId: string, content: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    await db.prepare(`
      INSERT INTO ticket_interactions (id, ticket_id, user_id, type, content)
      VALUES (?, ?, ?, 'comment', ?)
    `).run(uuidv4(), ticketId, session.user_id, content);

    await db.prepare(`
      UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(ticketId);

    revalidatePath(`/admin/tickets/${ticketId}`);
    return { success: true };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { error: 'Failed to add comment' };
  }
}

export async function getTickets(filters?: { status?: string; assignee_id?: string; requester_id?: string }) {
  const session = await getSession();
  if (!session) return [];

  let query = `
    SELECT t.*, 
      r.name as requester_name, r.email as requester_email,
      a.name as assignee_name
    FROM tickets t
    JOIN users r ON t.requester_id = r.id
    LEFT JOIN users a ON t.assignee_id = a.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters?.status && filters.status !== 'all') {
    query += ` AND t.status = ?`;
    params.push(filters.status);
  }

  if (filters?.assignee_id) {
    query += ` AND t.assignee_id = ?`;
    params.push(filters.assignee_id);
  }

  if (filters?.requester_id) {
    query += ` AND t.requester_id = ?`;
    params.push(filters.requester_id);
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

    return { ...ticket, interactions };
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    return null;
  }
}

export async function getPotentialAssignees() {
  const session = await getSession();
  if (!session) return [];

  try {
    // Retorna admins e operadores
    return await db.prepare(`
      SELECT id, name, email, role 
      FROM users 
      WHERE role IN ('admin', 'operator')
      ORDER BY name ASC
    `).all();
  } catch (error) {
    console.error('Error fetching assignees:', error);
    return [];
  }
}
