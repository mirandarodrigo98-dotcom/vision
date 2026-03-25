const { Pool } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL')).split('=')[1].replace(/"/g, '').trim();

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const deptId = '8a19e3cb-e486-42f6-a226-90f36f895f7d'; // Controladoria
  
  const permissions = [
    'ir.view', 'ir.create', 'ir.details.view', 'ir.status.update', 
    'ir.indication.edit', 'ir.receipt.register', 'ir.partners.manage'
  ];
  
  for (const p of permissions) {
    const { rowCount } = await pool.query("SELECT 1 FROM department_permissions WHERE department_id = $1 AND permission_code = $2", [deptId, p]);
    if (rowCount === 0) {
      await pool.query("INSERT INTO department_permissions (department_id, permission_code) VALUES ($1, $2)", [deptId, p]);
      console.log(`Added ${p}`);
    } else {
      console.log(`Already had ${p}`);
    }
  }
  
  console.log('Permissions fixed for Controladoria department!');
  process.exit(0);
}

run().catch(console.error);