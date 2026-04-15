const axios = require('axios');
const { Pool } = require('pg');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const { rows } = await pool.query('SELECT * FROM omie_config WHERE id = 1');
    const config = rows[0];
    pool.end();

    if (!config) return console.log('No config');

    const payloadCc = {
      call: "ListarContasCorrentes",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ pagina: 1, registros_por_pagina: 500 }]
    };
    
    try {
      const resCc = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', payloadCc);
      const ccList = resCc.data.ListarContasCorrentes || resCc.data.conta_corrente_cadastro || resCc.data.ListarContasCorrentesResponse || [];
      
      const targetBanks = ccList.filter(cc => {
          const nome = cc.descricao || cc.cDescricao || '';
          return nome.toLowerCase().includes('itaú') || nome.toLowerCase().includes('itau') || nome.toLowerCase().includes('inter');
      });

      console.log(JSON.stringify(targetBanks, null, 2));
    } catch (e) {
      console.log(e.response?.data || e.message);
    }
}
main();