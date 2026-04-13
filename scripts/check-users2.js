const { Client } = require('pg');

const db = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vision'
});

async function main() {
  await db.connect();

  console.log('--- Checking User Daniele ---');
  const daniele = await db.query(`SELECT id, name, email, role, department_id FROM users WHERE name ILIKE '%daniele%'`);
  console.log('Daniele users:', daniele.rows);

  for (const user of daniele.rows) {
    if (user.role === 'operator' && user.department_id) {
      console.log(`Checking department ${user.department_id} permissions for Daniele...`);
      const deps = await db.query(`SELECT permission_code FROM department_permissions WHERE department_id = $1`, [user.department_id]);
      console.log('Department permissions:', deps.rows.map(r => r.permission_code));
    } else if (user.role === 'client_user') {
      const perms = await db.query(`SELECT permission_code FROM user_permissions WHERE user_id = $1`, [user.id]);
      console.log('User permissions:', perms.rows.map(r => r.permission_code));
    }
  }

  console.log('\n--- Checking User Isaura ---');
  const isaura = await db.query(`SELECT id, name, email, role, department_id FROM users WHERE name ILIKE '%isaura%'`);
  console.log('Isaura users:', isaura.rows);

  for (const user of isaura.rows) {
    if (user.role === 'operator' && user.department_id) {
      console.log(`Checking department ${user.department_id} permissions for Isaura...`);
      const deps = await db.query(`SELECT permission_code FROM department_permissions WHERE department_id = $1`, [user.department_id]);
      console.log('Department permissions:', deps.rows.map(r => r.permission_code));
    } else if (user.role === 'client_user') {
      const perms = await db.query(`SELECT permission_code FROM user_permissions WHERE user_id = $1`, [user.id]);
      console.log('User permissions:', perms.rows.map(r => r.permission_code));
    }
  }

  await db.end();
}

main().catch(console.error);
