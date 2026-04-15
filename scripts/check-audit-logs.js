const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_logs'")
  .then(res => { console.log(res.rows); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });