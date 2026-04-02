const { Pool } = require('pg');
const fs = require('fs');

const envConfig = fs.readFileSync('.env', 'utf-8');
const envVars = envConfig.split('\n').reduce((acc, line) => {
  const eqIdx = line.indexOf('=');
  if (eqIdx > 0) {
    const key = line.substring(0, eqIdx).trim();
    let value = line.substring(eqIdx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
    }
    acc[key] = value;
  }
  return acc;
}, {});

const originalConnectionString = envVars.DATABASE_URL || '';
const hasSslMode = originalConnectionString.includes('sslmode=require');
const isNeon = originalConnectionString.includes('neon.tech');

let connectionString = originalConnectionString;
if (hasSslMode) {
  connectionString = connectionString.replace('?sslmode=require', '').replace('&sslmode=require', '');
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: (isNeon || hasSslMode || process.env.NODE_ENV === 'production') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT e.name, c.nome as company_name, e.cpf, e.is_active, e.dismissal_date FROM employees e JOIN client_companies c ON e.company_id = c.id');
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    client.release();
    pool.end();
  }
}

main().catch(console.error);