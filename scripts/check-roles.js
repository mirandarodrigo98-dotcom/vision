const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Roles in role_permissions ---');
    const rolesRes = await client.query('SELECT DISTINCT role FROM role_permissions');
    console.log(rolesRes.rows);

    console.log('\n--- Isaura User Role ---');
    const userRes = await client.query("SELECT id, name, role FROM users WHERE name LIKE '%ISAURA%'");
    console.log(userRes.rows);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
