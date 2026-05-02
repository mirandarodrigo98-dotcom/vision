import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export async function createSession(userId: string, role: string) {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  await db.query(`
    INSERT INTO sessions (id, user_id, role, expires_at)
    VALUES ($1, $2, $3, $4)
  `, [sessionId, userId, role, expiresAt]);

  const cookieStore = await cookies();
  cookieStore.set('session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt)
  });

  return sessionId;
}

export async function getSession(updateLastSeen = true) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;

  if (!sessionId) return null;

  const session = (await db.query(`
    SELECT 
      s.*, 
      u.email, 
      u.name, 
      u.avatar_path,
      u.active_company_id,
      u.department_id,
      u.carne_leao_access,
      c.razao_social as company_name,
      c.cnpj as company_cnpj,
      (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) - EXTRACT(EPOCH FROM COALESCE(s.last_seen_at, s.created_at))) as inactivity_seconds
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN client_companies c ON u.active_company_id = c.id
    WHERE s.id = $1
  `, [sessionId])).rows[0] as any;

  if (!session) return null;

  // Check expiration via JS to avoid DB timezone issues
  if (new Date(session.expires_at) < new Date()) {
    await db.query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
    return null;
  }

  // Check for inactivity (INACTIVITY_TIMEOUT_MS is in ms, inactivity_seconds is in seconds)
  const inactivitySeconds = parseFloat(session.inactivity_seconds || '0');
  if (inactivitySeconds > (INACTIVITY_TIMEOUT_MS / 1000)) {
    await db.query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
    return null;
  }

  // Atualizar last_seen apenas se solicitado (padrão true)
  if (updateLastSeen) {
    await db.query(`UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1`, [sessionId]);
  }

  return session;
}

export async function logout() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  
  if (sessionId) {
    await db.query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
  }
  
  cookieStore.delete('session_id');
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
