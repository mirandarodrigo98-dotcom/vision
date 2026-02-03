'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function getAdmissionHistory(admissionId: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  // Ensure user has access to this admission
  const admission = await db.prepare('SELECT created_by_user_id, company_id FROM admission_requests WHERE id = ?').get(admissionId) as any;
  
  if (!admission) {
    return { error: 'Admissão não encontrada.' };
  }

  // Verify ownership or admin
  if (session.role === 'client_user' && admission.created_by_user_id !== session.user_id) {
    // Also check if user belongs to the same company? 
    // For now strict ownership or same company logic if needed. 
    // The previous logic checked `created_by_user_id`.
    return { error: 'Unauthorized' };
  }

  try {
    const logs = await db.prepare(`
      SELECT 
        al.id,
        al.action,
        al.timestamp as created_at,
        al.metadata,
        u.name as user_name,
        al.actor_email
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      WHERE al.entity_id = ?
      ORDER BY al.timestamp DESC
    `).all(admissionId) as Array<{
      id: string;
      action: string;
      created_at: string;
      metadata: string;
      user_name: string;
      actor_email: string;
    }>;

    return { success: true, logs };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { error: 'Erro ao buscar histórico.' };
  }
}

export async function getTransferHistory(transferId: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const transfer = await db.prepare('SELECT created_by_user_id, source_company_id FROM transfer_requests WHERE id = ?').get(transferId) as any;
  
  if (!transfer) {
    return { error: 'Transferência não encontrada.' };
  }

  if (session.role === 'client_user') {
      const hasAccess = await db.prepare(`
          SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
      `).get(session.user_id, transfer.source_company_id);

      if (!hasAccess && transfer.created_by_user_id !== session.user_id) {
          return { error: 'Unauthorized' };
      }
  }

  try {
    const logs = await db.prepare(`
      SELECT 
        al.id,
        al.action,
        al.timestamp as created_at,
        al.metadata,
        u.name as user_name,
        al.actor_email
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      WHERE al.entity_id = ?
      ORDER BY al.timestamp DESC
    `).all(transferId) as Array<{
      id: string;
      action: string;
      created_at: string;
      metadata: string;
      user_name: string;
      actor_email: string;
    }>;

    return { success: true, logs };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { error: 'Erro ao buscar histórico.' };
  }
}
