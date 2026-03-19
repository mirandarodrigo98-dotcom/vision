const Database = require('better-sqlite3');
const db = new Database('./prisma/sqlite.db');
const row = db.prepare("SELECT company_id FROM simples_nacional_billing WHERE competence >= '2025-01' LIMIT 1").get();
console.log(row);
