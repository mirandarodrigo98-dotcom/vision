const { Pool } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL')).split('=')[1].replace(/"/g, '').trim();

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const { rows } = await pool.query("SELECT * FROM users WHERE name ILIKE '%daniele%' OR email ILIKE '%daniele%'");
  console.log('User:', rows);
  
  for (const user of rows) {
     if (user.role === 'client_user') {
         const perms = await pool.query("SELECT * FROM user_permissions WHERE user_id = $1", [user.id]);
         console.log('Perms for', user.email, ':', perms.rows);
     } else if (user.role === 'operator') {
         const perms = await pool.query("SELECT * FROM department_permissions WHERE department_id = $1", [user.department_id]);
         console.log('Perms from department', user.department_id, ':', perms.rows);
         
         const rolePerms = await pool.query("SELECT * FROM role_permissions WHERE role = $1", [user.role]);
         console.log('Perms from role', user.role, ':', rolePerms.rows);
         
         const userPerms = await pool.query("SELECT * FROM user_permissions WHERE user_id = $1", [user.id]);
         console.log('Direct Perms for', user.email, ':', userPerms.rows);
     }
  }
  process.exit(0);
}

run().catch(console.error);