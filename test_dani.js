const fs = require('fs');
const { Pool } = require('pg');
const env = fs.readFileSync('.env', 'utf-8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL')).split('=')[1].replace(/"/g, '').trim();
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function check() {
  const users = await pool.query("SELECT id, name, email, department_id, role FROM users WHERE name ILIKE '%daniele%'");
  console.log('Users:', users.rows);
  process.exit(0);
}
check();