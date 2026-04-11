'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function getAdmissionHistory(admissionId: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  // Ensure user has access to this admission
  const admission = (await db.query(`SELECT created_by_user_id, company_id FROM admission_requests WHERE id = $1`, [admissionId])).rows[0] as any;
  
  if (!admission) {
    return { error: 'Admissão não encontrada.' };
  }

  // Verify access (company or ownership)
  if (session.role === 'client_user') {
      const hasAccess = (await db.query(`
          SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2
      `, [session.user_id, admission.company_id])).rows[0];

      // If user has access to the company, they can see the history
      // Fallback: check if they are the creator (though creator should usually have company access)
      if (!hasAccess && admission.created_by_user_id !== session.user_id) {
          return { error: 'Unauthorized' };
      }
  }

  try {
    const logs = (await db.query(`
      SELECT 
        al.id,
        al.action,
        al.timestamp as created_at,
        al.metadata,
        u.name as user_name,
        al.actor_email
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      WHERE al.entity_id = $1
      ORDER BY al.timestamp DESC
    `, [admissionId])).rows as Array<{
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

export async function getLeaveHistory(leaveId: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Unauthorized' };
  }

  const leave = (await db.query(`SELECT created_by_user_id, company_id FROM leaves WHERE id = $1`, [leaveId])).rows[0] as any;
  
  if (!leave) {
    return { error: 'Afastamento não encontrado.' };
  }

  if (session.role === 'client_user') {
      const hasAccess = (await db.query(`
          SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2
      `, [session.user_id, leave.company_id])).rows[0];

      if (!hasAccess && leave.created_by_user_id !== session.user_id) {
          return { error: 'Unauthorized' };
      }
  }

  try {
    const logs = (await db.query(`
      SELECT 
        al.id,
        al.action,
        al.timestamp as created_at,
        al.metadata,
        u.name as user_name,
        al.actor_email
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      WHERE al.entity_id = $1
      ORDER BY al.timestamp DESC
    `, [leaveId])).rows as Array<{
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

  const dismissal = (await db.query(`SELECT created_by_user_id, company_id FROM dismissals WHERE id = $1`, [dismissalId])).rows[0] as any;
  
  if (!dismissal) {
    return { error: 'Rescisão não encontrada.' };
  }

  if (session.role === 'client_user') {
      const hasAccess = (await db.query(`
          SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2
      `, [session.user_id, dismissal.company_id])).rows[0];

      if (!hasAccess && dismissal.created_by_user_id !== session.user_id) {
          return { error: 'Unauthorized' };
      }
  }

  try {
    const logs = (await db.query(`
      SELECT 
        al.id,
        al.action,
        al.timestamp as created_at,
        al.metadata,
        u.name as user_name,
        al.actor_email
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      WHERE al.entity_id = $1
      ORDER BY al.timestamp DESC
    `, [dismissalId])).rows as Array<{
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

  const vacation = (await db.query(`SELECT created_by_user_id, company_id FROM vacations WHERE id = $1`, [vacationId])).rows[0] as any;
  
  if (!vacation) {
    return { error: 'Férias não encontrada.' };
  }

  if (session.role === 'client_user') {
      const hasAccess = (await db.query(`
          SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2
      `, [session.user_id, vacation.company_id])).rows[0];

      if (!hasAccess && vacation.created_by_user_id !== session.user_id) {
          return { error: 'Unauthorized' };
      }
  }

  try {
    const logs = (await db.query(`
      SELECT 
        al.id,
        al.action,
        al.timestamp as created_at,
        al.metadata,
        u.name as user_name,
        al.actor_email
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      WHERE al.entity_id = $1
      ORDER BY al.timestamp DESC
    `, [vacationId])).rows as Array<{
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

  const transfer = (await db.query(`SELECT created_by_user_id, source_company_id FROM transfer_requests WHERE id = $1`, [transferId])).rows[0] as any;
  
  if (!transfer) {
    return { error: 'Transferência não encontrada.' };
  }

  if (session.role === 'client_user') {
      const hasAccess = (await db.query(`
          SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2
      `, [session.user_id, transfer.source_company_id])).rows[0];

      if (!hasAccess && transfer.created_by_user_id !== session.user_id) {
          return { error: 'Unauthorized' };
      }
  }

  try {
    const logs = (await db.query(`
      SELECT 
        al.id,
        al.action,
        al.timestamp as created_at,
        al.metadata,
        u.name as user_name,
        al.actor_email
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_user_id = u.id
      WHERE al.entity_id = $1
      ORDER BY al.timestamp DESC
    `, [transferId])).rows as Array<{
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
