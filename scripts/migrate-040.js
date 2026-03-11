const db = require('better-sqlite3')('admissao.db');
const fs = require('fs');
const path = require('path');

const migrationFile = path.join(__dirname, '../src/db/migrations/040_add_access_schedules.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

console.log('Running migration...');

// Split by semicolon to run statements individually, as better-sqlite3 exec might run all but good to be safe/granular
// However, exec() runs the whole script.
try {
    db.exec(sql);
    console.log('Migration successful.');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('Column access_schedule_id already exists. Skipping ALTER TABLE.');
    } else {
        console.error('Migration failed:', error);
    }
}
