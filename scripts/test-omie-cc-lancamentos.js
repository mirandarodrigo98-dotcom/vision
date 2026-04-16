const axios = require('axios');
const { Pool } = require('pg');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const { rows } = await pool.query('SELECT * FROM omie_config WHERE id = 1');
    const config = rows[0];
    pool.end();

    try {
      const res = await axios.post('https://app.omie.com.br/api/v1/financas/contacorrentelancamentos/', {
        call: "ListarLancamentosCC",
        app_key: config.app_key,
        app_secret: config.app_secret,
        param: [{ 
            pagina: 1,
            registros_por_pagina: 10,
            nCodCC: 6700224052,
            dPeriodoDe: "10/04/2026",
            dPeriodoAte: "10/04/2026"
        }]
      });
      const records = res.data.listar_lancamentos || [];
      console.log(records.map(r => ({
          data: r.detalhes.dDtLanc,
          alt: r.detalhes.dDtAlt,
          inc: r.detalhes.dDtInc,
          hrInc: r.detalhes.cHrInc,
          hrAlt: r.detalhes.cHrAlt,
          obs: r.detalhes.cObsLanc
      })));
    } catch (e) {
      console.log(e.response?.data || e.message);
    }
}
main();