const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
    try {
        const res = await pool.query("SELECT id, nome, razao_social, is_active FROM client_companies WHERE nome LIKE '%CF DOS%' OR razao_social LIKE '%CF DOS%'");
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();