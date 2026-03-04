const db = require('better-sqlite3')('vision.db');

console.log('Applying migration: Digisac is_active column...');

try {
  // Check if column exists
  const tableInfo = db.prepare("PRAGMA table_info(digisac_config)").all();
  const hasIsActive = tableInfo.some(col => col.name === 'is_active');

  if (!hasIsActive) {
    db.exec(`
      ALTER TABLE digisac_config ADD COLUMN is_active INTEGER DEFAULT 0;
    `);
    console.log('Column is_active added successfully!');
  } else {
    console.log('Column is_active already exists.');
  }

} catch (error) {
  console.error('Error applying migration:', error);
  process.exit(1);
}
