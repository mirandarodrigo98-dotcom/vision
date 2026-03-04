const db = require('better-sqlite3')('vision.db');

console.log('Applying migration: Digisac Config...');

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS digisac_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      base_url TEXT NOT NULL,
      api_token TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    INSERT OR IGNORE INTO digisac_config (id, base_url, api_token) 
    VALUES (1, 'https://api.digisac.com.br', '');
  `);
  
  console.log('Migration applied successfully!');
} catch (error) {
  console.error('Error applying migration:', error);
  process.exit(1);
}
