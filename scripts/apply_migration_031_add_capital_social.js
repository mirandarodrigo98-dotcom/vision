const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('sslmode=require'))
    ? { rejectUnauthorized: false }
    : undefined,
});

async function run() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to PostgreSQL...');

    // Add capital_social_centavos column if missing
    const sql = `
      ALTER TABLE client_companies 
      ADD COLUMN IF NOT EXISTS capital_social_centavos INTEGER;
    `;

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Column capital_social_centavos ensured on client_companies.');
  } catch (err) {
    console.error('Migration 031 failed:', err);
    if (client) await client.query('ROLLBACK');
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

run();
