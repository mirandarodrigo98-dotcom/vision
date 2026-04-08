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

  const appKey = config.app_key;
  const appSecret = config.app_secret;
  const dataEmissaoDe = "01/03/2026";
  const dataEmissaoAte = "31/03/2026";

  try {
    const payload = {
      call: "ListarContasReceber",
      app_key: appKey,
      app_secret: appSecret,
      param: [
        {
          pagina: 1,
          registros_por_pagina: 50,
          apenas_importado_api: "N",
          filtrar_por_data_de: dataEmissaoDe,
          filtrar_por_data_ate: dataEmissaoAte,
          filtrar_apenas_inclusao: "S",
          exibir_recibos: "S"
        }
      ]
    };
    const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    const contas = response.data.conta_receber_cadastro || [];
    console.log("Contas:", contas.length);
    const recebido = contas.find(c => c.status_titulo === 'RECEBIDO');
    if (recebido) console.log("EXEMPLO RECEBIDO:", JSON.stringify(recebido, null, 2));
  } catch (error) {
    console.log(error.response?.data || error.message);
  }
  } catch (error) {
    const errorMsg = error.response?.data?.faultstring || error.message;
    console.error('Erro na integração Omie (OUTER):', errorMsg, error.response?.data);
  }
}
test();