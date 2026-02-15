const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../admissao.db');
const db = new Database(dbPath);

const migrationPath = path.join(__dirname, '../src/db/migrations/029_create_societario_processes_contracts.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');

try {
  db.exec(migration);
  console.log('Migration 029 (Societário processos/contratos) applied successfully.');
} catch (error) {
  console.error('Error applying Societário migration 029:', error);
  process.exit(1);
}
