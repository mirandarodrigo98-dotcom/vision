import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.replace('\r', '');
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
    }
  });
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const { rows: companies } = await client.query(`SELECT id, razao_social FROM client_companies WHERE razao_social ILIKE '%PRIMEIRA IGREJA BATISTA DE MURIAE%'`);
    if (companies.length > 0) {
      const companyId = companies[0].id;
      console.log('Company:', companies[0]);

      // Remove leading zeros from eklesia_categories description
      const resCatDesc = await client.query(`
        UPDATE eklesia_categories 
        SET description = REGEXP_REPLACE(description, '^0+', '') 
        WHERE company_id = $1 AND description LIKE '0%'
      `, [companyId]);
      console.log(`Updated ${resCatDesc.rowCount} category descriptions.`);

      // Remove leading zeros from eklesia_accounts description
      const resAccDesc = await client.query(`
        UPDATE eklesia_accounts 
        SET description = REGEXP_REPLACE(description, '^0+', '') 
        WHERE company_id = $1 AND description LIKE '0%'
      `, [companyId]);
      console.log(`Updated ${resAccDesc.rowCount} account descriptions.`);

      // Also ensure integration_code for accounts is updated if needed
      const resAccInt = await client.query(`
        UPDATE eklesia_accounts 
        SET integration_code = REGEXP_REPLACE(integration_code, '^0+', '') 
        WHERE company_id = $1 AND integration_code LIKE '0%'
      `, [companyId]);
      console.log(`Updated ${resAccInt.rowCount} account integration codes.`);
    }
  } finally {
    client.release();
    pool.end();
  }
}

run().catch(console.error);