const axios = require('axios');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function findBoleto() {
  const query = `SELECT codigo_lancamento FROM omie_recebimentos LIMIT 100`;
  const res = await pool.query(query);
  const codigos = res.rows.map(r => r.codigo_lancamento);
  
  const configRes = await pool.query('SELECT * FROM omie_config WHERE id = 1');
  const config = configRes.rows[0];
  
  for (const cod of codigos) {
      const payload = { 
        call: 'ListarContasReceber', 
        app_key: config.app_key, 
        app_secret: config.app_secret, 
        param: [{ 
           codigo_lancamento_omie: cod,
           exibir_link_boleto: "S"
         }] 
      };
      
      const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload);
      const contas = response.data.conta_receber_cadastro || [];
      const boleto = contas.find(c => c.cLinkBoleto);
      
      if (boleto) {
         console.log('Encontrou boleto:', boleto.cLinkBoleto);
         const resPdf = await fetch(boleto.cLinkBoleto);
         const contentType = resPdf.headers.get('content-type');
         console.log('Content-Type:', contentType);
         const buf = await resPdf.arrayBuffer();
         const headerStr = Buffer.from(buf).subarray(0, 15).toString();
         console.log('Header:', headerStr);
         
         if (contentType && contentType.includes('text/html')) {
            const html = Buffer.from(buf).toString('utf-8');
            console.log('PDF matches:', html.match(/https?:\/\/[^"']+\.pdf/g));
            const iframe = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
            console.log('Iframe:', iframe ? iframe[1] : null);
         }
         break;
      }
  }
  pool.end();
}
findBoleto();