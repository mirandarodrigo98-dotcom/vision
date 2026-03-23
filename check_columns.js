const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ir_declarations';
    `);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();