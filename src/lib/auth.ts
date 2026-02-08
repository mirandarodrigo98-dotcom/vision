import db from '@/lib/db';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

export async function createSession(userId: string, role: string) {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  await db.prepare(`
    INSERT INTO sessions (id, user_id, role, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, userId, role, expiresAt);

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

export async function getSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;

  if (!sessionId) return null;

  const session = await db.prepare(`
    SELECT 
      s.*, 
      u.email, 
      u.name, 
      u.avatar_path,
      u.active_company_id,
      c.razao_social as company_name,
      c.cnpj as company_cnpj
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN client_companies c ON u.active_company_id = c.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).get(sessionId) as any;

  if (!session) return null;

  // Atualizar last_seen
  await db.prepare("UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?").run(sessionId);

  return session;
}

export async function logout() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  
  if (sessionId) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }
  
  cookieStore.delete('session_id');
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
