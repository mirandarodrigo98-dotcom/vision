
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Adding due_date column to tickets table...');
    await client.query('ALTER TABLE tickets ADD COLUMN due_date TIMESTAMP');
    console.log('Migration successful!');
  } catch (error) {
    if (error.code === '42701') { // duplicate_column
        console.log('Column due_date already exists.');
    } else {
        console.error('Migration failed:', error);
    }
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
