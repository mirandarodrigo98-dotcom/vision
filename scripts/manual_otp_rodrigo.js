const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(process.cwd(), 'admissao.db');
const db = new Database(dbPath);

const targetEmail = 'rodrigo@nzdcontabilidade.com.br';

console.log(`Configurando acesso para: ${targetEmail}`);

// 1. Verificar se existe na tabela admin_allowed_emails
let user = db.prepare('SELECT * FROM admin_allowed_emails WHERE email = ?').get(targetEmail);

if (!user) {
    console.log('Usuário não encontrado. Inserindo...');
    db.prepare('INSERT INTO admin_allowed_emails (id, email, is_active) VALUES (?, ?, 1)').run(uuidv4(), targetEmail);
} else {
    console.log('Usuário já existe na base de admins.');
}

// 2. Gerar OTP
const token = '123456';
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

// Invalidar tokens antigos
db.prepare('UPDATE otp_tokens SET used_at = ? WHERE email = ? AND used_at IS NULL').run(new Date().toISOString(), targetEmail);

// Inserir novo token
db.prepare(`
    INSERT INTO otp_tokens (id, email, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
`).run(uuidv4(), targetEmail, tokenHash, expiresAt);

console.log('------------------------------------------------');
console.log(`✅ Admin Configurado: ${targetEmail}`);
console.log(`🔑 Código de Acesso: ${token}`);
console.log('------------------------------------------------');
