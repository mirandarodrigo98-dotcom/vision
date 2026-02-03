const db = require('better-sqlite3')('admissao.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

const usersColumns = db.prepare("PRAGMA table_info(users)").all();
console.log('Users Columns:', usersColumns.map(c => c.name));

const companiesColumns = db.prepare("PRAGMA table_info(client_companies)").all();
console.log('Companies Columns:', companiesColumns.map(c => c.name));
