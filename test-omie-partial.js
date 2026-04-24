const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function test() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const config = (await pool.query('SELECT * FROM omie_config WHERE id = 1')).rows[0];
  pool.end();

  try {
    // Listar contas para pegar uma
    const payloadList = {
      call: "ListarContasReceber",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ pagina: 1, registros_por_pagina: 5, apenas_importado_api: "N", filtrar_apenas_titulos_em_aberto: "S" }]
    };
    const resList = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payloadList);
    const titulos = resList.data.conta_receber_cadastro;
    
    if (titulos.length === 0) { console.log('Nenhum título em aberto'); return; }
    
    const titulo = titulos[0];
    console.log(`Título selecionado: ${titulo.codigo_lancamento_omie} | Valor original: ${titulo.valor_documento}`);

    // Fazer baixa parcial de R$ 1,00
    const payloadData = {
      codigo_lancamento: titulo.codigo_lancamento_omie,
      codigo_conta_corrente: titulo.id_conta_corrente || 6673818074,
      valor: 1.00,
      data: "15/04/2026"
    };

    console.log('Enviando payload:', payloadData);

    const payload = {
      call: "LancarRecebimento",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [payloadData]
    };

    const resRec = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload);
    console.log('Resposta LancarRecebimento:', resRec.data);

    // Consultar o título novamente para ver como ficou
    const payloadConsulta = {
        call: "ConsultarContaReceber",
        app_key: config.app_key,
        app_secret: config.app_secret,
        param: [{ codigo_lancamento_omie: titulo.codigo_lancamento_omie }]
    };
    const resCons = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payloadConsulta);
    console.log('Status após baixa:', resCons.data.cabecalho.status_titulo, '| Valor pago:', resCons.data.resumo.valor_pago);

  } catch (e) {
    console.log('Erro:', e.response?.data || e.message);
  }
}
test();
