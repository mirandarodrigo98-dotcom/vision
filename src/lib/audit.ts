import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export type AuditAction = 
  | 'LOGIN' 
  | 'OTP_REQUEST' 
  | 'OTP_SENT' 
  | 'OTP_VERIFIED' 
  | 'CREATE_CLIENT' 
  | 'UPDATE_CLIENT' 
  | 'CREATE_USER' 
  | 'UPDATE_USER' 
  | 'SEND_PASSWORD' 
  | 'CREATE_ADMISSION' 
  | 'SUBMIT_ADMISSION' 
  | 'UPLOAD_FILE' 
  | 'EMAIL_SENT' 
  | 'EMAIL_FAILED'
  | 'CREATE_ADMISSION_ERROR'
  | 'LOGIN_FAIL'
  | 'UPDATE_SETTINGS'
  | 'CREATE_TEAM_USER'
  | 'UPDATE_TEAM_USER_STATUS'
  | 'DELETE_TEAM_USER'
  | 'SEND_EMAIL_MOCK'
  | 'SEND_EMAIL_ERROR'
  | 'SEND_EMAIL_SUCCESS'
  | 'SEND_EMAIL_EXCEPTION'
  | 'CREATE_DISMISSAL'
  | 'CREATE_TRANSFER'
  | 'CREATE_VACATION'
  | 'DELETE_CLIENT'
  | 'TOGGLE_CLIENT_STATUS'
  | 'IMPORT_COMPANIES_CSV'
  | 'UPDATE_DISMISSAL'
  | 'CANCEL_DISMISSAL'
  | 'APPROVE_DISMISSAL'
  | 'UPDATE_VACATION'
  | 'CANCEL_VACATION'
  | 'APPROVE_VACATION'
  | 'UPDATE_TRANSFER'
  | 'CANCEL_TRANSFER'
  | 'APPROVE_TRANSFER'
  | 'CANCEL_ADMISSION'
  | 'UPDATE_ADMISSION'
  | 'CREATE_LEAVE'
  | 'UPDATE_LEAVE'
  | 'CANCEL_LEAVE'
  | 'APPROVE_LEAVE'
  | 'GENERATE_TEMP_PASSWORD'
  | 'APPROVE_ADMISSION'
  | 'UPDATE_PASSWORD';

interface AuditLogParams {
  actor_user_id?: string;
  actor_email?: string;
  role?: string;
  action: AuditAction;
  entity_type?: string;
  entity_id?: string;
  ip?: string;
  user_agent?: string;
  metadata?: object;
  success: boolean;
  error_message?: string;
}

export async function logAudit(params: AuditLogParams) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (
        id, actor_user_id, actor_email, role, action, 
        entity_type, entity_id, ip, user_agent, 
        metadata, success, error_message, timestamp
      ) VALUES (
        ?, ?, ?, ?, ?, 
        ?, ?, ?, ?, 
        ?, ?, ?, datetime('now', '-03:00')
      )
    `);

    await stmt.run(
      uuidv4(),
      params.actor_user_id || null,
      params.actor_email || null,
      params.role || null,
      params.action,
      params.entity_type || null,
      params.entity_id || null,
      params.ip || null,
      params.user_agent || null,
      params.metadata ? JSON.stringify(params.metadata) : null,
      params.success ? 1 : 0,
      params.error_message || null
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Não lançar erro para não quebrar o fluxo principal
  }
}
