import { randomBytes } from 'crypto';

const tokens = new Map<string, number>();

export function generateCSRFToken(): string {
  const token = randomBytes(32).toString('hex');
  tokens.set(token, Date.now() + 3600000); // 1 hora
  return token;
}

export function validateCSRFToken(token: string): boolean {
  const expiry = tokens.get(token);
  if (!expiry || Date.now() > expiry) {
    tokens.delete(token);
    return false;
  }

  tokens.delete(token); // Token único
  return true;
}