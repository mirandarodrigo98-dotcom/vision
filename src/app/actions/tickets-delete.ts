'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { deleteFromR2 } from '@/lib/r2';

export async function deleteTicketAttachment(attachmentId: string, ticketId: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  // Only admins can delete attachments
  if (session.role !== 'admin') {
    return { error: 'Apenas administradores podem excluir anexos' };
  }

  try {
    // Get attachment info first
    const attachment = await db.prepare('SELECT file_key FROM ticket_attachments WHERE id = ?').get(attachmentId) as any;
    
    if (!attachment) {
      return { error: 'Anexo não encontrado' };
    }

    // Delete from R2 if file_key exists
    if (attachment.file_key) {
      try {
        await deleteFromR2(attachment.file_key);
      } catch (err) {
        console.error('Failed to delete from R2, proceeding with DB deletion:', err);
      }
    }

    // Delete from DB
    await db.prepare('DELETE FROM ticket_attachments WHERE id = ?').run(attachmentId);

    revalidatePath(`/admin/tickets/${ticketId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting attachment:', error);
    return { error: 'Erro ao excluir anexo: ' + (error?.message || String(error)) };
  }
}
