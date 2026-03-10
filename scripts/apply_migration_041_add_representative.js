const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Fallback if .env is missing or DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";
}

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

    // Add is_representative column if missing
    const sql = `
      ALTER TABLE societario_company_socios 
      ADD COLUMN IF NOT EXISTS is_representative INTEGER DEFAULT 0;
    `;

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Column is_representative ensured on societario_company_socios.');
  } catch (err) {
    console.error('Migration 041 failed:', err);
    if (client) await client.query('ROLLBACK');
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

run();
