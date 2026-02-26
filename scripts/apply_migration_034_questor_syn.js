const db = require('better-sqlite3')('vision.db');
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '..', 'src', 'db', 'migrations', '034_create_questor_syn_module_tokens.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');

console.log('Applying migration:', migrationPath);
db.exec(migration);
console.log('Migration applied successfully.');
