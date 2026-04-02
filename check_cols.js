const { Pool } = require('pg');
const fs = require('fs');
const envVars = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const eqIdx = line.indexOf('=');
  if (eqIdx > 0) acc[line.substring(0, eqIdx).trim()] = line.substring(eqIdx + 1).trim().replace(/^"|"$/g, '');
  return acc;
}, {});
const pool = new Pool({ connectionString: envVars.DATABASE_URL.replace('?sslmode=require', ''), ssl: { rejectUnauthorized: false } });
pool.query("SELECT * FROM client_companies LIMIT 1").then(res => {
  console.log(res.rows);
  pool.end();
}).catch(console.error);