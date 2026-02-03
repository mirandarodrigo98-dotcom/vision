const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(process.cwd(), 'admissao.db');
const db = new Database(dbPath);

const email = 'rodrigo@nzdcontabilidade.com.br';
const rawPassword = '123456';

// 1. Hash password
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(rawPassword, salt, 1000, 64, 'sha512').toString('hex');
const passwordHash = `${salt}:${hash}`;

console.log(`Configurando senha para: ${email}`);

// 2. Check if user exists
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

if (user) {
    console.log('Usuário encontrado. Atualizando senha...');
    db.prepare(`
        UPDATE users 
        SET password_hash = ?, role = 'admin', is_active = 1
        WHERE email = ?
    `).run(passwordHash, email);
} else {
    console.log('Usuário não encontrado. Criando novo Admin...');
    const userId = uuidv4();
    db.prepare(`
        INSERT INTO users (id, name, email, role, is_active, password_hash)
        VALUES (?, ?, ?, 'admin', 1, ?)
    `).run(userId, 'Rodrigo Admin', email, passwordHash);
}

// 3. Ensure email is in admin_allowed_emails
const allowed = db.prepare('SELECT * FROM admin_allowed_emails WHERE email = ?').get(email);
if (!allowed) {
    console.log('Adicionando à whitelist de admins...');
    db.prepare('INSERT INTO admin_allowed_emails (email, is_active) VALUES (?, 1)').run(email);
}

console.log('------------------------------------------------');
console.log(`✅ Senha definida com sucesso: ${rawPassword}`);
console.log('------------------------------------------------');
