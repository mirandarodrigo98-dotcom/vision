const fs = require('fs');
const { Pool } = require('pg');
const env = fs.readFileSync('.env', 'utf-8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL')).split('=')[1].replace(/"/g, '').trim();
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function check() {
  const users = await pool.query("SELECT * FROM sessions s JOIN users u ON s.user_id = u.id WHERE u.email = 'daniele@nzdcontabilidade.com.br'");
  console.log('Sessions:', users.rows);
  const perms = await pool.query("SELECT * FROM department_permissions WHERE department_id = '8a19e3cb-e486-42f6-a226-90f36f895f7d'");
  console.log('Perms for dept:', perms.rows.map(r => r.permission_code));
  process.exit(0);
}
check();