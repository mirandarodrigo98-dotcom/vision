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
      exibir_link_boleto: 'S'
    }] 
  };
  
  const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload);
  const contas = response.data.conta_receber_cadastro || [];
  
  const boleto = contas.find(c => c.cLinkBoleto);
  if (!boleto) {
      console.log('Nenhum link de boleto encontrado.');
      pool.end();
      return;
  }
  
  const url = boleto.cLinkBoleto;
  console.log('Baixando:', url);
  
  let res = await fetch(url, { headers: { 'Accept': 'application/pdf, application/octet-stream, */*' } });
  let contentType = res.headers.get('content-type') || '';
  console.log('Content-Type 1:', contentType);
  
  if (contentType.includes('text/html')) {
      const htmlText = await res.text();
      const pdfMatch = htmlText.match(/<iframe[^>]+src=["']([^"']+\.pdf[^"']*)["']/i) 
                    || htmlText.match(/window\.location\.href\s*=\s*["']([^"']+\.pdf[^"']*)["']/i)
                    || htmlText.match(/https?:\/\/[^"'\s>]+\.pdf/i);
                    
      if (pdfMatch && pdfMatch[1]) {
          const realPdfUrl = pdfMatch[1].startsWith('http') ? pdfMatch[1] : 'https://app.omie.com.br' + (pdfMatch[1].startsWith('/') ? '' : '/') + pdfMatch[1];
          console.log('Link real:', realPdfUrl);
          res = await fetch(realPdfUrl, { headers: { 'Accept': 'application/pdf, application/octet-stream, */*' } });
      } else {
          console.log('Não encontrou link PDF no HTML');
      }
  }
  
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  console.log('Header final:', buffer.subarray(0, 15).toString('utf-8'));
  fs.writeFileSync('teste_omie_final.pdf', buffer);
  console.log('Salvo em teste_omie_final.pdf');
  pool.end();
}

testDownload();