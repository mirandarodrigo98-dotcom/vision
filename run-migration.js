const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

async function run() {
  try {
    console.log('Running migration...');
    await pool.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE'");
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    await pool.end();
  }
}

run();
