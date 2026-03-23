const { Pool } = require('pg');
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("SELECT id, is_active, nome, razao_social FROM client_companies WHERE razao_social ILIKE '%CF DOS SANTOS%'")
  .then(res => { console.log(res.rows); pool.end(); })
  .catch(err => { console.error(err); pool.end(); });
