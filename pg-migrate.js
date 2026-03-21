const { Pool } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
env.split('\n').forEach(line => {
  const match = line.match(/^DATABASE_URL=(.*)$/);
  if (match) {
    dbUrl = match[1].replace(/^"|"$/g, '').replace('\r', '').trim();
  }
});

const isNeon = dbUrl.includes('neon.tech');
const hasSslMode = dbUrl.includes('sslmode=require');
if (hasSslMode) {
  dbUrl = dbUrl.replace('?sslmode=require', '').replace('&sslmode=require', '');
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: (isNeon || hasSslMode) ? { rejectUnauthorized: false } : undefined
});

async function run() {
  try {
    await pool.query('ALTER TABLE simples_nacional_billing ADD COLUMN IF NOT EXISTS recebimento DECIMAL(15,2) DEFAULT 0');
    console.log('Added recebimento column');
    await pool.query('ALTER TABLE simples_nacional_billing ADD COLUMN IF NOT EXISTS aliquota_efetiva DECIMAL(10,4) DEFAULT 0');
    console.log('Added aliquota_efetiva column');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();