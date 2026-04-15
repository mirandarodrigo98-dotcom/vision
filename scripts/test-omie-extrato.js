const axios = require('axios');
const { Pool } = require('pg');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const { rows } = await pool.query('SELECT * FROM omie_config WHERE id = 1');
    const config = rows[0];
    pool.end();

    const payload = {
      call: "ListarExtrato",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ nCodCC: 7016916698, cDataInicial: "01/04/2025", cDataFinal: "30/04/2025" }]
    };
    
    try {
      const res = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', payload);
      console.log(res.data);
    } catch (e) {
      console.log(e.response?.data || e.message);
    }
}
main();