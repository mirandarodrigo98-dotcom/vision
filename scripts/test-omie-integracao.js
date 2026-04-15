const axios = require('axios');
const { Pool } = require('pg');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const { rows } = await pool.query('SELECT * FROM omie_config WHERE id = 1');
    const config = rows[0];
    pool.end();

    const payload = {
      call: "Listar",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ pagina: 1, registros_por_pagina: 10 }]
    };
    
    try {
      const res = await axios.post('https://app.omie.com.br/api/v1/financas/integracaobancaria/', payload);
      console.log("Success", res.data);
    } catch (e) {
      console.log("Error", e.response?.data || e.message);
    }
}
main();