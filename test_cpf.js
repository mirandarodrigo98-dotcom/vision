const { Pool } = require('pg');
const fs = require('fs');
const envVars = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const eqIdx = line.indexOf('=');
  if (eqIdx > 0) acc[line.substring(0, eqIdx).trim()] = line.substring(eqIdx + 1).trim().replace(/^"|"$/g, '');
  return acc;
}, {});
const pool = new Pool({ connectionString: envVars.DATABASE_URL.replace('?sslmode=require', ''), ssl: { rejectUnauthorized: false } });

async function test() {
  const res = await pool.query('SELECT column_name, column_default FROM information_schema.columns WHERE table_name = $1 AND column_name = $2', ['employees', 'status']);
  console.log(res.rows);
  pool.end();
}
test();
