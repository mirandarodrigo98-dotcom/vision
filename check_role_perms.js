const { Pool } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL')).split('=')[1].replace(/"/g, '').trim();

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const { rows } = await pool.query("SELECT * FROM role_permissions WHERE permission LIKE '%ir.%'");
  console.log('Role Permissions with IR:', rows);
  process.exit(0);
}

run().catch(console.error);