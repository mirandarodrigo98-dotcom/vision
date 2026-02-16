const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../admissao.db');
const db = new Database(dbPath);

const migrationPath = path.join(__dirname, '../src/db/migrations/031_add_capital_social_to_companies.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');

try {
  db.exec(migration);
  console.log('Migration 031 (Add capital_social_centavos to client_companies) applied successfully.');
} catch (error) {
  if (String(error.message || '').includes('duplicate column name')) {
    console.log('Column capital_social_centavos already exists. Skipping.');
  } else {
    console.error('Error applying migration 031:', error);
    process.exit(1);
  }
}
