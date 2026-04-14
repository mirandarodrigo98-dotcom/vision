const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function updateConstraints() {
  try {
    // Drop existing unique constraints/indexes
    await pool.query(`ALTER TABLE client_companies DROP CONSTRAINT IF EXISTS client_companies_cnpj_key`);
    await pool.query(`ALTER TABLE client_companies DROP CONSTRAINT IF EXISTS client_companies_code_key`);
    await pool.query(`DROP INDEX IF EXISTS client_companies_cnpj_key`);
    await pool.query(`DROP INDEX IF EXISTS idx_client_companies_code`);
    
    // Create new composite unique index
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS client_companies_code_filial_cnpj_idx 
      ON client_companies (COALESCE(code, ''), COALESCE(filial, ''), COALESCE(cnpj, ''))
    `);
    
    console.log("Constraints updated successfully");
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

updateConstraints();