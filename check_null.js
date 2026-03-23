const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  try {
    const res = await pool.query("SELECT COUNT(*) FROM client_companies WHERE is_active = 1 AND nome IS NULL");
    console.log("nome is null:", res.rows);
    
    const res2 = await pool.query("SELECT COUNT(*) FROM client_companies WHERE is_active = 1 AND razao_social IS NULL");
    console.log("razao_social is null:", res2.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();