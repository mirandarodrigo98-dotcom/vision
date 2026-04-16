const axios = require('axios');
const { Pool } = require('pg');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const { rows } = await pool.query('SELECT * FROM omie_config WHERE id = 1');
    const config = rows[0];
    pool.end();

    try {
      const res = await axios.post('https://app.omie.com.br/api/v1/financas/pesquisartitulos/', {
        call: "PesquisarLancamentos",
        app_key: config.app_key,
        app_secret: config.app_secret,
        param: [{ 
            nCodCC: 6700224052,
            dDtPagamentoDe: "01/04/2026",
            dDtPagamentoAte: "15/04/2026"
        }]
      });
      const records = res.data.titulosEncontrados || [];
      console.log(records.map(r => ({
          cliente: r.cabecTitulo.cNomeCliente || r.cabecTitulo.cCPFCNPJCliente,
          pagamento: r.cabecTitulo.dDtPagamento,
          alt: r.cabecTitulo.dDtAlt,
          inc: r.cabecTitulo.dDtInc,
          hrAlt: r.cabecTitulo.cHrAlt
      })));
    } catch (e) {
      console.log(e.response?.data || e.message);
    }
}
main();