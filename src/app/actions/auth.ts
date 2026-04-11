'use server'

import db from '@/lib/db';
import { createSession, verifyPassword, getSession, hashPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/email/resend';
import { checkUserAccess } from '@/app/actions/schedules';
import { logAudit } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import rateLimit from '@/lib/rate-limit';

const loginLimiter = rateLimit({
  interval: 60000, // 1 minuto
  uniqueTokenPerInterval: 500,
});

async function checkRateLimit(email: string) {
  try {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1';
    // Usando IP + Email para rate limit mais assertivo (5 tentativas por IP/Email por minuto)
    await loginLimiter.check(5, `${ip}-${email}`);
    return true;
  } catch {
    return false;
  }
}

export async function checkUserType(rawEmail: string) {
  if (!(await checkRateLimit(rawEmail))) {
    throw new Error('Muitas tentativas. Tente novamente em 1 minuto.');
  }

  try {
    const email = rawEmail.toLowerCase().trim();
    
    // 1. Check if user exists and has a password
    const user = (await db.query(`SELECT role, password_hash FROM users WHERE email = $1 AND is_active = 1`, [email])).rows[0] as any;
    
    // If user has password, prefer password method
    if (user && user.password_hash) {
        return { type: user.role, authMethod: 'password' };
    }

    // 2. Check if it's an allowed admin email (for OTP fallback if no password)
    const adminAllowed = (await db.query(`SELECT * FROM admin_allowed_emails WHERE email = $1 AND is_active = 1`, [email])).rows[0];
    if (adminAllowed) {
      return { type: 'admin', authMethod: 'otp' };
    }

    // 3. Existing user without password (e.g. operators purely on OTP)
    if (user) {
      return { type: user.role, authMethod: 'otp' };
    }

    return { type: null, authMethod: null };
  } catch (error: any) {
    console.error('Error in checkUserType:', error);
    throw new Error(`Failed to check user type: ${error.message}`);
  }
}

export async function requestOtp(rawEmail: string) {
  if (!(await checkRateLimit(rawEmail))) {
    return { error: 'Muitas tentativas. Tente novamente em 1 minuto.' };
  }

  const email = rawEmail.toLowerCase().trim();
  // 1. Verificar permissão (Admin Whitelist OU Usuário Existente com role admin/operator)
  const adminAllowed = (await db.query(`SELECT * FROM admin_allowed_emails WHERE email = $1 AND is_active = 1`, [email])).rows[0];
  const user = (await db.query(`SELECT * FROM users WHERE email = $1 AND is_active = 1`, [email])).rows[0] as any;

  let role = null;

  if (adminAllowed) {
    role = 'admin';
  } else if (user && (user.role === 'admin' || user.role === 'operator')) {
    role = user.role;
  }

  if (!role) {
    logAudit({
      action: 'OTP_REQUEST',
      actor_email: email,
      role: 'unknown',
      success: false,
      error_message: 'Email not allowed for OTP'
    });
    return { error: 'Email não autorizado para acesso via código.' };
  }

  // 2. Gerar Token
  const token = crypto.randomInt(100000, 999999).toString();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  // 3. Salvar Token
  await db.query(`
    INSERT INTO otp_tokens (id, email, token_hash, expires_at)
    VALUES ($1, $2, $3, $4)
  `, [uuidv4(), email, tokenHash, expiresAt]);

  // LOG TEMPORÁRIO PARA DEBUG (MOSTRAR NO TERMINAL)
  console.log('------------------------------------------------');
  console.log(`🔐 OTP GERADO PARA ${email} (${role}): [ ${token} ]`);
  console.log('------------------------------------------------');

  // 4. Enviar Email
  try {
    await sendEmail({
      to: email,
      subject: 'Seu código de acesso - NZD',
      html: `<p>Seu código de acesso é: <strong>${token}</strong></p><p>Válido por 15 minutos.</p>`,
      category: 'otp',
      metadata: { actor_id: 'system' }
    });
  } catch (e) {
      console.error('Erro envio email:', e);
      // Não retornar erro para não bloquear login se email falhar mas log mostrar token
      // return { error: 'Erro ao enviar email.' };
  }

  logAudit({
    action: 'OTP_SENT',
    actor_email: email,
    role: role,
    success: true
  });

  return { success: true };
}

export async function verifyOtp(rawEmail: string, token: string) {
  if (!(await checkRateLimit(rawEmail))) {
    return { error: 'Muitas tentativas. Tente novamente em 1 minuto.' };
  }

  const email = rawEmail.toLowerCase().trim();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  console.log(`[VERIFY] Checking ${email} token ${token}`);

  // Buscar token sem verificar expiração no SQL para debug
  const record = (await db.query(`
    SELECT * FROM otp_tokens 
    WHERE email = $1 AND token_hash = $2 AND used_at IS NULL
  `, [email, tokenHash])).rows[0] as any;
  
  if (!record) {
    console.log('[VERIFY] Token not found or already used');
    logAudit({
      action: 'OTP_VERIFIED',
      actor_email: email,
      role: 'unknown',
      success: false,
      error_message: 'Invalid token'
    });
    return { error: 'Código inválido.' };
  }

  // Verificar expiração via JS (mais seguro que SQL datetime)
  const now = new Date();
  const expiresAt = new Date(record.expires_at);
  
  console.log(`[VERIFY] Expiry check: Now=${now.toISOString()}, Expires=${expiresAt.toISOString()}`);

  if (now > expiresAt) {
      console.log('[VERIFY] Token expired');
      return { error: 'Código expirado.' };
  }

  // Marcar como usado
  await db.query(`UPDATE otp_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1`, [record.id]);
  
  let user = (await db.query(`SELECT * FROM users WHERE email = $1`, [email])).rows[0] as any;
  
  // Se usuário não existe, só cria se for Admin (whitelist)
  if (!user) {
     const adminAllowed = (await db.query(`SELECT * FROM admin_allowed_emails WHERE email = $1 AND is_active = 1`, [email])).rows[0];
     
     if (adminAllowed) {
        const userId = uuidv4();
        await db.query(`
          INSERT INTO users (id, name, email, role, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [userId, 'Admin', email]);
        user = { id: userId, role: 'admin' };
     } else {
         // Teoricamente não deveria chegar aqui se requestOtp validar bem, mas por segurança:
         return { error: 'Usuário não encontrado.' };
     }
  }

  // Check access schedule
  const accessCheck = await checkUserAccess(user.id);
  if (!accessCheck.allowed) {
      return { error: accessCheck.reason || 'Acesso não permitido neste horário.' };
  }

  await createSession(user.id, user.role);

  logAudit({
    action: 'LOGIN',
    actor_user_id: user.id,
    actor_email: email,
    role: user.role,
    success: true,
    metadata: { method: 'otp' }
  });

  return { success: true };
}

export async function loginClient(email: string, password: string) {
  if (!(await checkRateLimit(email))) {
    return { error: 'Muitas tentativas. Tente novamente em 1 minuto.' };
  }

  // Allow any user with a password to login here (Admin, Operator, Client)
  const user = (await db.query(`SELECT * FROM users WHERE email = $1`, [email])).rows[0] as any;

  if (!user || !user.password_hash) {
     logAudit({ action: 'LOGIN_FAIL', actor_email: email, role: 'unknown', success: false, error_message: 'Invalid credentials' });
     return { error: 'Credenciais inválidas.' };
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
      logAudit({ action: 'LOGIN_FAIL', actor_email: email, role: user.role, success: false, error_message: 'Invalid password' });
      return { error: 'Credenciais inválidas.' };
  }
  
  if (!user.is_active) {
      return { error: 'Conta inativa.' };
  }

  // Check access schedule
  const accessCheck = await checkUserAccess(user.id);
  if (!accessCheck.allowed) {
      logAudit({ action: 'LOGIN_FAIL', actor_email: email, role: user.role, success: false, error_message: 'Access schedule restriction' });
      return { error: accessCheck.reason || 'Você está fora do seu horário de expediente.' };
  }

  // Check temp password expiration
  if (user.password_temporary && user.temp_password_expires_at) {
      const expiresAt = new Date(user.temp_password_expires_at);
      if (new Date() > expiresAt) {
          return { error: 'Senha provisória expirada.' };
      }
  }

  await createSession(user.id, user.role);

  logAudit({
    action: 'LOGIN',
    actor_user_id: user.id,
    actor_email: email,
    role: user.role,
    success: true,
    metadata: { method: 'password' }
  });

  if (user.password_temporary) {
      return { success: true, mustChangePassword: true };
  }

  return { success: true };
}

export async function updatePassword(password: string) {
    const session = await getSession();
    if (!session) return { error: 'Não autorizado' };

    // Validar senha (mínimo 6 caracteres)
    if (password.length < 6) {
        return { error: 'A senha deve ter no mínimo 6 caracteres.' };
    }

    try {
        const hash = await hashPassword(password);
        
        await db.query(`
            UPDATE users 
            SET password_hash = $1, password_temporary = 0, temp_password_expires_at = NULL, updated_at = NOW()
            WHERE id = $2
        `, [hash, session.user_id]);

        logAudit({
            action: 'UPDATE_PASSWORD',
            actor_user_id: session.user_id,
            actor_email: session.email,
            role: session.role,
            success: true
        });

        return { success: true };
    } catch (error: any) {
        console.error('Failed to update password:', error);
        return { error: 'Erro ao atualizar senha: ' + (error.message || 'Erro desconhecido') };
    }
}

export async function logout() {
  (await cookies()).delete('session_id');
  redirect('/login');
}
