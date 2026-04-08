const axios = require('axios');
const { Pool } = require('pg');
const fs = require('fs');

const envVars = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const eqIdx = line.indexOf('=');
  if (eqIdx > 0) acc[line.substring(0, eqIdx).trim()] = line.substring(eqIdx + 1).trim().replace(/^"|"$/g, '');
  return acc;
}, {});

const pool = new Pool({ connectionString: envVars.DATABASE_URL.replace('?sslmode=require', ''), ssl: { rejectUnauthorized: false } });

async function test() {
  const res = await pool.query('SELECT * FROM omie_config');
  const config = res.rows[0];
  pool.end();
  
  if(!config) return console.log("No config");

  try {
    const payload = {
      call: "ListarContasReceber",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [
        {
          pagina: 1,
          registros_por_pagina: 100,
          apenas_importado_api: "N",
          filtrar_por_data_de: "01/03/2026",
          filtrar_por_data_ate: "31/03/2026",
          filtrar_apenas_inclusao: "N"
        }
      ]
    };
    const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    const contas = response.data.conta_receber_cadastro || [];
    const withBarcode = contas.filter(c => c.boleto && c.boleto.cGerado === 'S');
    console.log("Com boleto:", withBarcode.length);
    if(withBarcode.length > 0) {
      console.log(JSON.stringify(withBarcode.slice(0, 2).map(c => ({
        num_doc: c.numero_documento,
        boleto: c.boleto,
        barras: c.codigo_barras_ficha_compensacao
      })), null, 2));
    }
  } catch (error) {
    console.log(error.response?.data || error.message);
  }
}
test();