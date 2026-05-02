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
    
    // Get client info
    const cnpj = '08581691000104'; // Replace with a valid CNPJ from DB if needed, or just test
    let url = `${config.base_url.replace(/\/$/, '')}/api/v1/${config.api_token}/clientes/58520528000171`;
    const response = await fetch(url, { 
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json'
      }
    });
    const text = await response.text();
    console.log(text);

  } catch (err) {
    console.error(err.message);
  } finally {
    pool.end();
  }
}

run();