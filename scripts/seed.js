const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '..', 'admissao.db');
const db = new Database(dbPath);

const adminEmail = 'admin@nzd.com.br';

// 1. Adicionar email permitido
const insertAllowed = db.prepare(`
  INSERT OR IGNORE INTO admin_allowed_emails (id, email) VALUES (?, ?)
`);
insertAllowed.run(uuidv4(), adminEmail);

// 2. Criar usuário admin se não existir
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);

if (!user) {
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);
  insertUser.run(uuidv4(), 'Admin Inicial', adminEmail, 'admin');
  console.log(`Admin user created: ${adminEmail}`);
} else {
  console.log(`Admin user already exists: ${adminEmail}`);
}

console.log('Seed completed.');
