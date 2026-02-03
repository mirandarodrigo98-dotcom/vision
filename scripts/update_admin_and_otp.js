const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(process.cwd(), 'admissao.db');
const db = new Database(dbPath);

const newAdminEmail = 'rodrigo@nzdcontabilidade.com.br';

console.log(`Atualizando admin para: ${newAdminEmail}`);

// 1. Atualizar ou Inserir na tabela de emails permitidos
const existing = db.prepare('SELECT * FROM admin_allowed_emails WHERE email = ?').get('admin@nzd.com.br');

if (existing) {
    db.prepare('UPDATE admin_allowed_emails SET email = ? WHERE email = ?').run(newAdminEmail, 'admin@nzd.com.br');
    console.log('E-mail admin atualizado no banco.');
} else {
    // Se não existir o admin antigo, tenta inserir o novo se não existir
    const checkNew = db.prepare('SELECT * FROM admin_allowed_emails WHERE email = ?').get(newAdminEmail);
    if (!checkNew) {
        db.prepare('INSERT INTO admin_allowed_emails (id, email) VALUES (?, ?)').run(uuidv4(), newAdminEmail);
        console.log('E-mail admin inserido no banco.');
    } else {
        console.log('E-mail admin já existe.');
    }
}

// 2. Gerar OTP para o novo e-mail
const token = '123456';
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

// Invalidar tokens antigos deste email
db.prepare('UPDATE otp_tokens SET used_at = ? WHERE email = ? AND used_at IS NULL').run(new Date().toISOString(), newAdminEmail);

// Inserir novo token
db.prepare(`
    INSERT INTO otp_tokens (id, email, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
`).run(uuidv4(), newAdminEmail, tokenHash, expiresAt);

console.log('------------------------------------------------');
console.log(`✅ Novo Admin Configurado: ${newAdminEmail}`);
console.log(`🔑 Código de Acesso Gerado: ${token}`);
console.log('------------------------------------------------');
