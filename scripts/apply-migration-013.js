const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../admissao.db');
const db = new Database(dbPath);

const migrationPath = path.join(__dirname, '../src/db/migrations/013_create_dismissals.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');

try {
    db.exec(migration);
    console.log('Migration 013 (Dismissals) applied successfully.');
} catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
}
