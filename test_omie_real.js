const axios = require('axios');
const { Pool } = require('pg');
const fs = require('fs');

const envVars = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const eqIdx = line.indexOf('=');
  if (eqIdx > 0) acc[line.substring(0, eqIdx).trim()] = line.substring(eqIdx + 1).trim().replace(/^"|"$/g, '');
  return acc;
}, {});

const pool = new Pool({ connectionString: envVars.DATABASE_URL.replace('?sslmode=require', ''), ssl: { rejectUnauthorized: false } });

async function test() {
  const res = await pool.query('SELECT * FROM omie_config');
  const config = res.rows[0];
  pool.end();
  
  if(!config) return console.log("No config");

  try {
    const payload = {
      call: "GerarBoleto",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [
        {
          nCodTitulo: 7150658233
        }
      ]
    };
    const response = await axios.post('https://app.omie.com.br/api/v1/financas/pesquisartitulos/', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(response.data);
  } catch (error) {
    console.log(error.response?.data || error.message);
  }
}
test();