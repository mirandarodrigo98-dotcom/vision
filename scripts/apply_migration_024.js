
const db = require('better-sqlite3')('d:\\VISION\\admissao-nzd\\vision.db');

try {
  console.log('Applying migration 024...');
  db.exec(`
    ALTER TABLE enuves_transactions ADD COLUMN account_id TEXT REFERENCES enuves_accounts(id) ON DELETE SET NULL;
  `);
  console.log('Migration 024 applied successfully.');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('Column account_id already exists.');
  } else {
    console.error('Error applying migration:', error);
  }
}
