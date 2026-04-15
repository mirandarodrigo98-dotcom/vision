const axios = require('axios');
const { Pool } = require('pg');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const { rows } = await pool.query('SELECT * FROM omie_config WHERE id = 1');
    const config = rows[0];
    pool.end();

    const payload = {
      call: "ListarContasCorrentes",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ pagina: 1, registros_por_pagina: 500 }]
    };
    
    try {
      const res = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', payload);
      const ccList = res.data.ListarContasCorrentes || [];
      const inter = ccList.find(c => c.descricao.toLowerCase().includes('inter'));
      const itau = ccList.find(c => c.descricao.toLowerCase().includes('itau') || c.descricao.toLowerCase().includes('itaú'));
      
      console.log("INTER:", JSON.stringify(inter, null, 2));
      console.log("ITAU:", JSON.stringify(itau, null, 2));
    } catch (e) {
      console.log(e.response?.data || e.message);
    }
}
main();