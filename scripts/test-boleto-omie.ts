import { Pool } from 'pg';
import axios from 'axios';
import fs from 'fs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  const config = (await pool.query('SELECT * FROM omie_config WHERE id = 1')).rows[0];
  if (!config) return console.log('no config');
  
  const payload = { 
    call: 'ListarContasReceber', 
    app_key: config.app_key, 
    app_secret: config.app_secret, 
    param: [{ 
      pagina: 1, 
      registros_por_pagina: 10, 
      apenas_importado_api: "N" 
    }] 
  };
  
  const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload);
  const contas = response.data.conta_receber_cadastro;
  
  const contaComBoleto = contas.find((c: any) => c.cLinkBoleto);
  if (!contaComBoleto) {
    console.log('nenhum boleto encontrado');
    return;
  }
  
  console.log('cLinkBoleto:', contaComBoleto.cLinkBoleto);

  try {
    const fetchResponse = await fetch(contaComBoleto.cLinkBoleto);
    const arrayBuffer = await fetchResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log('Header do arquivo baixado:', buffer.subarray(0, 15).toString('utf-8'));
    
    fs.writeFileSync('teste_boleto.pdf', buffer);
    console.log('Arquivo salvo como teste_boleto.pdf');
  } catch (err) {
    console.error('Erro ao baixar', err);
  }
  pool.end();
}
test();
