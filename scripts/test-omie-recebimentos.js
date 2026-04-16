const axios = require('axios');
const { Pool } = require('pg');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const { rows } = await pool.query('SELECT * FROM omie_config WHERE id = 1');
    const config = rows[0];
    pool.end();

    try {
      const res = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', {
        call: "ListarContasReceber",
        app_key: config.app_key,
        app_secret: config.app_secret,
        param: [{ 
            pagina: 1,
            registros_por_pagina: 10,
            filtrar_por_conta_corrente: 6700224052,
            filtrar_por_status: "RECEBIDO"
        }]
      });
      const records = res.data.conta_receber_cadastro || [];
      console.log(records.map(r => ({
          pagamento: r.data_pagamento,
          registro: r.data_registro,
          alt: r.data_alteracao,
          hrAlt: r.hora_alteracao,
          cliente: r.nome_fantasia || r.codigo_cliente_fornecedor
      })));
    } catch (e) {
      console.log(e.response?.data || e.message);
    }
}
main();