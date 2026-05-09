require('dotenv').config({ path: '.env' });
const axios = require('axios');
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const resConfig = await pool.query(`SELECT * FROM questor_zen_config LIMIT 1`);
    const config = resConfig.rows[0];
    const baseUrl = config.base_url.replace(/\/$/, '');
    const token = config.api_token;

    console.log('Buscando categorias em raw via fetch...');
    let response = await fetch(`${baseUrl}/api/v1/${token}/categorias`);
    let data = await response.text();
    fs.writeFileSync('zen_categorias_raw.json', data);
    console.log('Salvo', data.length);
    pool.end();
    
  } catch(e) {
    console.error(e.message);
    pool.end();
  }
}
run();