const { Pool } = require('pg');
const fs = require('fs');
const envVars = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const eqIdx = line.indexOf('=');
  if (eqIdx > 0) acc[line.substring(0, eqIdx).trim()] = line.substring(eqIdx + 1).trim().replace(/^"|"$/g, '');
  return acc;
}, {});
const pool = new Pool({ connectionString: envVars.DATABASE_URL.replace('?sslmode=require', ''), ssl: { rejectUnauthorized: false } });

async function test() {
  const query = `
    SELECT e.*, c.nome as company_name,
    CASE WHEN (
      EXISTS (SELECT 1 FROM dismissals d WHERE d.employee_id = e.id) OR
      EXISTS (SELECT 1 FROM vacations v WHERE v.employee_id = e.id) OR
      EXISTS (SELECT 1 FROM leaves l WHERE l.employee_id = e.id) OR
      EXISTS (SELECT 1 FROM transfer_requests tr WHERE tr.employee_name = e.name)
    ) THEN 1 ELSE 0 END as has_movements
    FROM employees e
    JOIN client_companies c ON e.company_id = c.id
    WHERE e.company_id = $1
  `;
  const res = await pool.query(query, ['ac696de8-6ff6-4448-a711-2aebd34c81eb']);
  console.log('Grid results for NZD:', res.rows);
  pool.end();
}
test();
