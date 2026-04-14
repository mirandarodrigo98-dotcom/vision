const { Pool } = require('pg');
const axios = require('axios');
const fs = require('fs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testDownload() {
  const configRes = await pool.query('SELECT * FROM omie_config WHERE id = 1');
  const config = configRes.rows[0];
  
  const payload = { 
    call: 'ListarContasReceber', 
    app_key: config.app_key, 
    app_secret: config.app_secret, 
    param: [{ 
      pagina: 1,
      registros_por_pagina: 100,
      filtrar_por_cpf_cnpj: '43139881000139'
    }] 
  };
  
  const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload);
  const contas = response.data.conta_receber_cadastro || [];
  if (contas.length === 0) return console.log('Sem contas');
  
  const id = contas[0].codigo_lancamento_omie;
  const resBoleto = await axios.post('https://app.omie.com.br/api/v1/financas/contareceberboleto/', {
     call: 'ObterBoleto',
     app_key: config.app_key, 
     app_secret: config.app_secret, 
     param: [{ nCodTitulo: id }]
  });
  
  const url = resBoleto.data.cLinkBoleto;
  if (!url) return console.log('No link');
  
  const resPdf = await fetch(url, {
      headers: {
          'Accept': 'application/pdf, application/octet-stream, */*'
      }
  });
  
  const buf = await resPdf.arrayBuffer();
  fs.writeFileSync('boleto_real.pdf', Buffer.from(buf));
  console.log('Salvo boleto_real.pdf', Buffer.from(buf).subarray(0, 15).toString());
  pool.end();
}

testDownload();