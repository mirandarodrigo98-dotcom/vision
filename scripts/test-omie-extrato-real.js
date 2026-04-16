const axios = require('axios');
const { Pool } = require('pg');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const { rows } = await pool.query('SELECT * FROM omie_config WHERE id = 1');
    const config = rows[0];
    pool.end();

    try {
      const res = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', {
        call: "ListarExtrato",
        app_key: config.app_key,
        app_secret: config.app_secret,
        param: [{ 
            nCodCC: 6700224052,
            dPeriodoInicial: "01/02/2026",
            dPeriodoFinal: "30/04/2026"
        }]
      });
      const movs = res.data.listaMovimentos || [];
      console.log(movs.filter(m => JSON.stringify(m).includes('METROTEK')));
    } catch (e) {
      console.log("ERRO:", e.response?.data || e.message);
    }
}
main();