const axios = require('axios');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function testObterBoleto() {
  const configRes = await pool.query('SELECT * FROM omie_config WHERE id = 1');
  const config = configRes.rows[0];
  
  const resDb = await pool.query("SELECT codigo_lancamento FROM omie_recebimentos LIMIT 10");
  for (const r of resDb.rows) {
      console.log('Testando:', r.codigo_lancamento);
      const payloadObter = {
          call: 'ObterBoleto',
          app_key: config.app_key,
          app_secret: config.app_secret,
          param: [{
              nCodTitulo: parseInt(r.codigo_lancamento)
          }]
      };
      try {
          const resBoleto = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/boleto/', payloadObter);
          console.log('ObterBoleto Keys:', Object.keys(resBoleto.data));
          console.log('Res:', resBoleto.data);
      } catch(e) {
          console.log('Erro:', e.response?.data || e.message);
      }
  }
  pool.end();
}
testObterBoleto();