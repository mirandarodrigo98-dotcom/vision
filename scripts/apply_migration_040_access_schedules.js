
const { Pool } = require('pg');
const fs = require('fs');
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

    const migrationPath = path.join(__dirname, '../src/db/migrations/040_add_access_schedules_pg.sql');
    console.log(`Reading migration file: ${migrationPath}`);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration 040 (Access Schedules)...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration 040 applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    if (client) await client.query('ROLLBACK');
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

run();
