const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'admissao.db');
const db = new Database(dbPath);

// Tabela de controle de migrações
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    applied_at TEXT DEFAULT (datetime('now'))
  );
`);

const migrationsDir = path.join(__dirname, '..', 'src', 'db', 'migrations');
const files = fs.readdirSync(migrationsDir).sort();

const getAppliedMigrations = db.prepare('SELECT filename FROM migrations').pluck();

const applied = new Set(getAppliedMigrations.all());

for (const file of files) {
  if (!file.endsWith('.sql')) continue;
  if (applied.has(file)) {
    console.log(`Skipping already applied migration: ${file}`);
    continue;
  }

  console.log(`Applying migration: ${file}`);
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
  
  const runMigration = db.transaction(() => {
    db.exec(content);
    db.prepare('INSERT INTO migrations (filename) VALUES (?)').run(file);
  });

  try {
    runMigration();
    console.log(`Successfully applied: ${file}`);
  } catch (err) {
    console.error(`Failed to apply migration ${file}:`, err);
    process.exit(1);
  }
}

console.log('All migrations applied.');
