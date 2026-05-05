require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const configRes = await pool.query(`SELECT * FROM questor_zen_config LIMIT 1`);
    const config = configRes.rows[0];
    const buildUrl = (path) => `${config.base_url.replace(/\/$/, '')}/api/v1/${config.api_token}${path}`;

    const res = await fetch(buildUrl(`/pegardocsedocqnet?dataInicial=2026-05-01&dataFinal=2026-05-02`));
    console.log('/pegardocsedocqnet status:', res.status);
    if(res.ok) {
        const json = await res.json();
        console.log(json.slice(0, 2));
    } else {
        console.log(await res.text());
    }

  } catch (err) {
    console.error('ERRO:', err.message);
  } finally {
    pool.end();
  }
}

run();