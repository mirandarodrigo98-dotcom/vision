require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`SELECT * FROM questor_zen_config LIMIT 1`);
    const config = res.rows[0];
    if (!config) return console.log('No Zen config');

    console.log('Zen URL:', config.base_url);
    const url = `${config.base_url}/api/v1/${config.api_token}/categorias`;
    console.log('Fetching:', url);

    const response = await fetch(url, { method: 'GET' });
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error(err.message);
  } finally {
    pool.end();
  }
}

run();