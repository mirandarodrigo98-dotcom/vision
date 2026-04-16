const axios = require('axios');
const { Pool } = require('pg');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const { rows } = await pool.query('SELECT * FROM omie_config WHERE id = 1');
    const config = rows[0];
    pool.end();

    const payloadCc = {
      call: "ListarContasCorrentes",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ pagina: 1, registros_por_pagina: 500 }]
    };
    
    try {
      const resCc = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', payloadCc);
      const ccList = resCc.data.ListarContasCorrentes || [];
      const caixinha = ccList.find(c => c.descricao === 'Caixinha');
      console.log("Caixinha ID:", caixinha.nCodCC);
      
      const payloadData = {
            codigo_lancamento: 7133180532,
            codigo_conta_corrente: caixinha.nCodCC,
            valor: 455,
            data: "15/04/2026"
        };
        
        const payload = {
          call: "LancarRecebimento",
          app_key: config.app_key,
          app_secret: config.app_secret,
          param: [payloadData]
        };
        const res = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload);
        console.log("RECEBIMENTO CAIXINHA:", res.data);
    } catch (e) {
      console.log("ERROR DATA:", e.response?.data);
    }
}
main();