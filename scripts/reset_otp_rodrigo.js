const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(process.cwd(), 'admissao.db');
const db = new Database(dbPath);

const email = 'rodrigo@nzdcontabilidade.com.br';
const token = '123456';

console.log(`Resetando tokens para: ${email}`);

// 1. Invalidar TODOS os tokens anteriores (mesmo os não usados)
db.prepare('UPDATE otp_tokens SET used_at = ? WHERE email = ? AND used_at IS NULL')
  .run(new Date().toISOString(), email);

// 2. Criar novo token limpo
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
// Expira em 1 hora para garantir
const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); 

db.prepare(`
    INSERT INTO otp_tokens (id, email, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
`).run(uuidv4(), email, tokenHash, expiresAt);

console.log('------------------------------------------------');
console.log(`✅ Tokens antigos invalidados.`);
console.log(`✅ Novo token gerado: ${token}`);
console.log(`✅ Validade: 1 hora`);
console.log('------------------------------------------------');
