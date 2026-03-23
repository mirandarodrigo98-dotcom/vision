const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'client_companies' AND column_name = 'is_active'");
    console.log(res.rows);
  } catch(e) {
    console.error("ERROR:", e);
  } finally {
    pool.end();
  }
}
test();