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

  // Verify access (company or ownership)
  if (session.role === 'client_user') {
      const hasAccess = await db.prepare(`
          SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
      `).get(session.user_id, admission.company_id);

      // If user has access to the company, they can see the history
      // Fallback: check if they are the creator (though creator should usually have company access)
      if (!hasAccess && admission.created_by_user_id !== session.user_id) {
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

export async function getDismissalHistory(dismissalId: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const dismissal = await db.prepare('SELECT created_by_user_id, company_id FROM dismissals WHERE id = ?').get(dismissalId) as any;
  
  if (!dismissal) {
    return { error: 'Rescisão não encontrada.' };
  }

  if (session.role === 'client_user') {
      const hasAccess = await db.prepare(`
          SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
      `).get(session.user_id, dismissal.company_id);

      if (!hasAccess && dismissal.created_by_user_id !== session.user_id) {
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
    `).all(dismissalId) as Array<{
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

export async function getVacationHistory(vacationId: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const vacation = await db.prepare('SELECT created_by_user_id, company_id FROM vacations WHERE id = ?').get(vacationId) as any;
  
  if (!vacation) {
    return { error: 'Férias não encontrada.' };
  }

  if (session.role === 'client_user') {
      const hasAccess = await db.prepare(`
          SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
      `).get(session.user_id, vacation.company_id);

      if (!hasAccess && vacation.created_by_user_id !== session.user_id) {
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
    `).all(vacationId) as Array<{
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
