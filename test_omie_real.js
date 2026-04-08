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

  const payloadCat = {
    call: "ListarCategorias",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{ pagina: 1, registros_por_pagina: 500 }]
  };

  const payloadCc = {
    call: "ListarContasCorrentes",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{ pagina: 1, registros_por_pagina: 500, apenas_importado_api: "N" }]
  };

  try {
    const resCat = await axios.post('https://app.omie.com.br/api/v1/geral/categorias/', payloadCat);
    console.log("Categorias:", resCat.data.categoria_cadastro?.length);
    if(resCat.data.categoria_cadastro?.length > 0) console.log(resCat.data.categoria_cadastro[0].codigo, resCat.data.categoria_cadastro[0].descricao);

    const resCc = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', payloadCc);
    const cc = resCc.data.conta_corrente_cadastro || resCc.data.ListarContasCorrentes || resCc.data.ListarContasCorrentesResponse;
    console.log("Contas Correntes:", cc?.length);
    if(cc?.length > 0) console.log(cc[0]);
  } catch (error) {
    console.log("Error status:", error.response?.status);
    console.log("Error data:", error.response?.data);
  }
}
test();