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

    // 1. Upload
    const filename = 'teste_upload_vision.csv';
    const csvContent = 'Teste;Coluna\n123;456';
    
    let uploadUrl = `${config.base_url}/api/v1/${config.api_token}/upload/${filename}`;
    console.log('Uploading to:', uploadUrl);
    
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: csvContent,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });
    
    const fileId = await uploadRes.json();
    console.log('File ID:', fileId);

  } catch (err) {
    console.error(err.message);
  } finally {
    pool.end();
  }
}

run();