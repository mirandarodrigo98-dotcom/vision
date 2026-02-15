const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../admissao.db');
const db = new Database(dbPath);

const migrationPath = path.join(__dirname, '../src/db/migrations/028_create_societario_module.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');

try {
  db.exec(migration);
  console.log('Migration 028 (Societário) applied successfully.');
} catch (error) {
  console.error('Error applying Societário migration:', error);
  process.exit(1);
}
