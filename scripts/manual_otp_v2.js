const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(process.cwd(), 'admissao.db');
const db = new Database(dbPath);

const email = 'admin@nzd.com.br';

if (email) {
    const token = '123456';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    // Invalidate old tokens
    db.prepare('UPDATE otp_tokens SET used_at = ? WHERE email = ? AND used_at IS NULL').run(new Date().toISOString(), email);

    // Insert new token
    db.prepare(`
        INSERT INTO otp_tokens (id, email, token_hash, expires_at)
        VALUES (?, ?, ?, ?)
    `).run(uuidv4(), email, tokenHash, expiresAt);

    console.log(`Email: ${email}`);
    console.log(`Code: ${token}`);
}
