const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined');
  process.exit(1);
}

// Simplified SSL logic
const ssl = connectionString.includes('neon.tech') || connectionString.includes('sslmode=require')
  ? { rejectUnauthorized: false } 
  : undefined;

const pool = new Pool({
  connectionString,
  ssl,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Connected to DB.');
    
    // Check if column exists
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='temp_password_expires_at';
    `);
    
    if (res.rows.length === 0) {
      console.log('Column temp_password_expires_at is MISSING. Adding it...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN temp_password_expires_at TIMESTAMP;
      `);
      console.log('Column added successfully.');
    } else {
      console.log('Column temp_password_expires_at already exists.');
    }

  } catch (err) {
    console.error('Error executing script:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
