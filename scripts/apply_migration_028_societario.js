const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

async function run() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to PostgreSQL...');

    const migrationPath = path.join(__dirname, '../src/db/migrations/028_create_societario_module.sql');
    console.log(`Reading migration file: ${migrationPath}`);
    let sql = fs.readFileSync(migrationPath, 'utf8');
    sql = sql
      .replace(/datetime\('now'\)/gi, 'NOW()')
      .replace(/datetime\("now"\)/gi, 'NOW()');

    console.log('Applying migration 028 (Societário)...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration 028 applied successfully!');
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
