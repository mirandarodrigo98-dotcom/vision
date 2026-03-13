
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

    const migrationPath = path.join(__dirname, '../src/db/migrations/042_enhance_tickets_module_pg.sql');
    console.log(`Reading migration file: ${migrationPath}`);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration 042 (Ticket Categories & Notifications)...');
    await client.query('BEGIN');
    
    // Split statements since pg driver might not handle multiple statements in one query if not supported,
    // but typically it does or we can split by semicolon if needed.
    // However, the provided file has semicolons. Let's try executing as one block.
    // Actually, simple `client.query` supports multiple statements.
    await client.query(sql);
    
    await client.query('COMMIT');
    console.log('Migration 042 applied successfully!');
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
