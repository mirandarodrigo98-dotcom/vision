const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(process.cwd(), 'admissao.db');
const db = new Database(dbPath);

console.log('Conectado ao banco de dados:', dbPath);

// 1. Configurar Admin
const adminEmail = 'rodrigo@nzdcontabilidade.com.br';
console.log(`Configurando admin: ${adminEmail}`);

try {
  // Inserir em admin_allowed_emails
  const insertAdmin = db.prepare(`
    INSERT INTO admin_allowed_emails (id, email, is_active, created_at)
    VALUES (?, ?, 1, datetime('now'))
    ON CONFLICT(email) DO UPDATE SET is_active = 1
  `);
  insertAdmin.run(crypto.randomUUID(), adminEmail);
  console.log('Admin inserido/atualizado em admin_allowed_emails.');
} catch (error) {
  console.error('Erro ao configurar admin:', error.message);
}

// 2. Configurar Email Destino
const destEmail = 'pessoal@nzdcontabilidade.com.br';
console.log(`Configurando email destino: ${destEmail}`);

try {
  const insertSetting = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES ('NZD_DEST_EMAIL', ?)
    ON CONFLICT(key) DO UPDATE SET value = ?
  `);
  insertSetting.run(destEmail, destEmail);
  console.log('Configuração de email de destino atualizada.');
} catch (error) {
  console.error('Erro ao configurar settings:', error.message);
}

console.log('Configuração concluída!');
