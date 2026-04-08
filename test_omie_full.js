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
          registros_por_pagina: 500,
          apenas_importado_api: "N",
          filtrar_por_data_de: dataEmissaoDe,
          filtrar_por_data_ate: dataEmissaoAte,
          filtrar_apenas_inclusao: "S"
        }
      ]
    };

    const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    const contas = response.data.conta_receber_cadastro || [];
    console.log("Contas:", contas.length);
    if (contas.length === 0) return { data: [] };

    // 1. Extrair IDs únicos
    const clientesIds = [...new Set(contas.map((c) => c.codigo_cliente_fornecedor).filter(Boolean))];
    console.log("Clientes:", clientesIds.length);
    
    // 2. Buscar Clientes (em lotes de 50)
    const clientesMap = new Map();
    const lotesClientes = [];
    for (let i = 0; i < clientesIds.length; i += 50) {
      lotesClientes.push(clientesIds.slice(i, i + 50));
    }
    
    await Promise.all(lotesClientes.map(async (lote) => {
      try {
        const payloadCli = {
          call: "ListarClientes",
          app_key: appKey,
          app_secret: appSecret,
          param: [{
            pagina: 1,
            registros_por_pagina: 50,
            apenas_importado_api: "N",
            clientesPorCodigo: lote.map(id => ({ codigo_cliente_omie: id }))
          }]
        };
        const resCli = await axios.post('https://app.omie.com.br/api/v1/geral/clientes/', payloadCli);
        const clientesList = resCli.data.clientes_cadastro || [];
        clientesList.forEach((cli) => {
          clientesMap.set(cli.codigo_cliente_omie, cli.razao_social || cli.nome_fantasia);
        });
      } catch (err) {
        console.error("Erro ao buscar lote de clientes", err.response?.data || err.message);
        throw err;
      }
    }));

    // 3. Buscar Categorias
    const categoriasMap = new Map();
    try {
      const payloadCat = {
        call: "ListarCategorias",
        app_key: appKey,
        app_secret: appSecret,
        param: [{ pagina: 1, registros_por_pagina: 500 }]
      };
      const resCat = await axios.post('https://app.omie.com.br/api/v1/geral/categorias/', payloadCat);
      const catList = resCat.data.categoria_cadastro || [];
      catList.forEach((cat) => categoriasMap.set(cat.codigo, cat.descricao));
    } catch (err) {
      console.error("Erro ao buscar categorias", err.response?.data || err.message);
      throw err;
    }

    // 4. Buscar Contas Correntes
    const contasCorrentesMap = new Map();
    try {
      const payloadCc = {
        call: "ListarContasCorrentes",
        app_key: appKey,
        app_secret: appSecret,
        param: [{ pagina: 1, registros_por_pagina: 500, apenas_importado_api: "N" }]
      };
      const resCc = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', payloadCc);
      const ccList = resCc.data.ListarContasCorrentes || resCc.data.conta_corrente_cadastro || resCc.data.ListarContasCorrentesResponse || [];
      ccList.forEach((cc) => contasCorrentesMap.set(cc.nIdCC, cc.descricao || cc.cDescricao));
    } catch (err) {
      console.error("Erro ao buscar contas correntes", err.response?.data || err.message);
      throw err;
    }

    console.log("Success");
  } catch (error) {
    const errorMsg = error.response?.data?.faultstring || error.message;
    console.error('Erro na integração Omie (OUTER):', errorMsg);
  }
}
test();