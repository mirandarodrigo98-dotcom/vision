const fs = require('fs');
const { Pool } = require('pg');

const env = fs.readFileSync('.env', 'utf8');
const dbUrl = env.split('\n').find(l => l.startsWith('DATABASE_URL=')).split('=')[1].trim().replace(/"/g, '');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await pool.query(`
    ALTER TABLE ir_declarations 
    ADD COLUMN outcome_type VARCHAR(20),
    ADD COLUMN outcome_value NUMERIC(10,2),
    ADD COLUMN payment_method VARCHAR(20),
    ADD COLUMN installments_count INTEGER,
    ADD COLUMN installment_value NUMERIC(10,2);
  `);
  console.log('Columns added');
  process.exit(0);
}

run().catch(console.error);