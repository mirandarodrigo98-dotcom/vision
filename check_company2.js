const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  try {
    let companiesQuery = "SELECT id, nome, razao_social FROM client_companies WHERE is_active = 1 AND (nome != '' OR razao_social != '') AND (nome ILIKE '%SANTOS%' OR razao_social ILIKE '%SANTOS%')";
    const res = await pool.query(companiesQuery);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();