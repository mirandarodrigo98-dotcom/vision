const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query(`
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'client_companies'
`)
  .then(res => { console.log(res.rows); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
