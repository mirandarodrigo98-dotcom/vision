const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL &&
    (process.env.DATABASE_URL.includes('neon.tech') ||
      process.env.DATABASE_URL.includes('sslmode=require'))
      ? { rejectUnauthorized: false }
      : undefined,
});

async function run() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to PostgreSQL...');

    const statements = [
      `ALTER TABLE societario_process_socios ADD COLUMN IF NOT EXISTS natureza_evento TEXT;`,
      `ALTER TABLE societario_process_socios ADD COLUMN IF NOT EXISTS qualificacao TEXT;`,
      `ALTER TABLE societario_process_socios ADD COLUMN IF NOT EXISTS pais TEXT;`,
    ];

    await client.query('BEGIN');
    for (const sql of statements) {
      await client.query(sql);
    }
    await client.query('COMMIT');
    console.log('Migration 032 (add natureza_evento, qualificacao, pais) applied.');
  } catch (err) {
    console.error('Migration 032 failed:', err);
    if (client) await client.query('ROLLBACK');
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

run();
