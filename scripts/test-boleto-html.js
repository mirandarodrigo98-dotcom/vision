const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  try {
    const res = await pool.query("SELECT codigo_lancamento FROM omie_recebimentos LIMIT 10");
    const codigos = res.rows.map(r => r.codigo_lancamento);
    
    const config = (await pool.query('SELECT * FROM omie_config WHERE id = 1')).rows[0];
    
    for (const cod of codigos) {
      const payload = { 
        call: 'ListarContasReceber', 
        app_key: config.app_key, 
        app_secret: config.app_secret, 
        param: [{ 
          codigo_lancamento_omie: cod
        }] 
      };
      
      const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload);
      const contas = response.data.conta_receber_cadastro;
      if (contas && contas.length > 0 && contas[0].cLinkBoleto) {
        console.log('Encontrou boleto:', contas[0].cLinkBoleto);
        const htmlRes = await axios.get(contas[0].cLinkBoleto);
        const html = htmlRes.data;
        
        // Procurar urls de pdf no html
        const pdfMatches = html.match(/https?:\/\/[^"']+\.pdf/g);
        console.log('PDFs encontrados no HTML:', pdfMatches);
        
        // Procurar algo como window.location ou iframe
        const iframeMatches = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        console.log('Iframe encontrado:', iframeMatches ? iframeMatches[1] : 'Nenhum');

        break;
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
test();
