
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('sslmode=require'))
    ? { rejectUnauthorized: false } 
    : undefined,
});

async function run() {
  try {
    console.log('Connecting to PostgreSQL...');
    await pool.query('SELECT 1'); // Test connection
    console.log('Connected.');

    const migrationPath = path.join(__dirname, '../src/db/migrations/036_create_departments.sql');
    console.log(`Reading migration file: ${migrationPath}`);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration...');
    await pool.query(sql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
