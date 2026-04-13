const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
      const val = match[2].replace(/"/g, '').trim();
      process.env[match[1]] = val;
  }
});

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
        const { rows: cols } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'departments'");
        console.log('departments cols:', cols);
        const { rows } = await pool.query(`
            SELECT u.id, u.name, u.email, u.role, u.department_id, d.name as department_name
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.name ILIKE '%daniele%' OR u.name ILIKE '%isaura%'
        `);
        console.log(JSON.stringify(rows, null, 2));

        const { rows: dRoles } = await pool.query(`
            SELECT * FROM department_roles LIMIT 10
        `);
        console.log('department_roles?', dRoles);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
main();