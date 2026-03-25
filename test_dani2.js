const fs = require('fs');
const { Pool } = require('pg');
const env = fs.readFileSync('.env', 'utf-8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL')).split('=')[1].replace(/"/g, '').trim();
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function check() {
  const users = await pool.query("SELECT * FROM user_permissions WHERE user_id = 'cb291430-e76f-4ac8-b4d1-26073f0e4254'");
  console.log('User Perms:', users.rows);
  process.exit(0);
}
check();