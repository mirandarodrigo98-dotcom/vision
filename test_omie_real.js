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
          registros_por_pagina: 5,
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
    console.log(Object.keys(contas[0]));
    console.log("cnpj", contas[0].cnpj_cpf, contas[0].cpf_cnpj);
  } catch (error) {
    console.log(error.response?.data || error.message);
  }
}
test();