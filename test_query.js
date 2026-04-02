const { Pool } = require('pg');
const fs = require('fs');
const envVars = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const eqIdx = line.indexOf('=');
  if (eqIdx > 0) acc[line.substring(0, eqIdx).trim()] = line.substring(eqIdx + 1).trim().replace(/^"|"$/g, '');
  return acc;
}, {});
const pool = new Pool({ connectionString: envVars.DATABASE_URL.replace('?sslmode=require', ''), ssl: { rejectUnauthorized: false } });

async function test() {
  const res = await pool.query('SELECT id, code, razao_social, nome FROM client_companies WHERE id = $1', ['ac696de8-6ff6-4448-a711-2aebd34c81eb']);
  console.log('Company:', res.rows);
  const empRes = await pool.query('SELECT count(*) FROM employees WHERE company_id = $1', ['ac696de8-6ff6-4448-a711-2aebd34c81eb']);
  console.log('Employees in this company:', empRes.rows);
  pool.end();
}
test();
