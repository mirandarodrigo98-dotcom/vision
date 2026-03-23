const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  try {
    const res = await pool.query("SELECT id, nome, razao_social FROM client_companies WHERE is_active = 1 AND (nome != '' OR razao_social != '') ORDER BY COALESCE(NULLIF(nome, ''), razao_social)");
    const found = res.rows.find(r => r.razao_social && r.razao_social.includes('CF DOS SANTOS'));
    console.log("FOUND:", found);
  } catch(e) {
    console.error("ERROR:", e);
  } finally {
    pool.end();
  }
}
test();