const axios = require('axios');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function findBoleto() {
  const configRes = await pool.query('SELECT * FROM omie_config WHERE id = 1');
  const config = configRes.rows[0];
  
  const payload = { 
    call: 'ListarContasReceber', 
    app_key: config.app_key, 
    app_secret: config.app_secret, 
    param: [{ 
      pagina: 1,
      registros_por_pagina: 100,
      filtrar_por_cpf_cnpj: '43139881000139',
      exibir_link_boleto: 'S'
    }] 
  };
  
  const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload);
  const contas = response.data.conta_receber_cadastro || [];
  const boleto = contas.find(c => c.cLinkBoleto);
  
  if (boleto) {
      console.log('Link:', boleto.cLinkBoleto);
      const resPdf = await fetch(boleto.cLinkBoleto, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      const html = await resPdf.text();
      const fs = require('fs');
      fs.writeFileSync('boleto.html', html);
      console.log('Salvo em boleto.html');
  }
  pool.end();
}
findBoleto();