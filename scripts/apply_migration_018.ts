
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'local.db');
const db = new Database(dbPath);

const migrationFile = path.join(process.cwd(), 'src', 'db', 'migrations', '018_create_enuves_categories.sql');
const migration = fs.readFileSync(migrationFile, 'utf-8');

try {
    console.log('Applying migration 018...');
    db.exec(migration);
    console.log('Migration applied successfully!');
} catch (error) {
    console.error('Error applying migration:', error);
}
