async function run() {
  const axios = require('axios').default || require('axios');
  const { Pool } = require('pg');

  const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' });

  async function getOmieConfig() {
    const res = await pool.query('SELECT app_key, app_secret FROM omie_config WHERE is_active = true LIMIT 1');
    return res.rows[0];
  }

  console.log("Starting test...");
  const conf = await getOmieConfig();
  if (!conf) return console.log("No config");

  try {
    const payloadData: any = {
      codigo_lancamento: 6819645077,
      codigo_conta_corrente: 6673818074,
      valor: 49,
      desconto: 0,
      juros: 0,
      multa: 0,
      data: "15/04/2026",
      baixar_documento: "N"
    };

    console.log('Enviando payload:', payloadData);

    const payload = {
      call: "LancarRecebimento",
      app_key: conf.app_key,
      app_secret: conf.app_secret,
      param: [payloadData]
    };

    const resRec = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload);
    console.log('Resposta LancarRecebimento:', resRec.data);

    // Consultar usando ConsultarContaReceber
    const payloadConsulta = {
        call: "ConsultarContaReceber",
        app_key: conf.app_key,
        app_secret: conf.app_secret,
        param: [{ 
            codigo_lancamento_omie: 6819645077
        }]
    };
    const resCons = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payloadConsulta);
    const tituloConsultado = resCons.data;
    if (tituloConsultado) {
        console.log('Valor documento:', tituloConsultado.valor_documento);
        console.log('Status titulo:', tituloConsultado.status_titulo);
        console.log('Resumo:', JSON.stringify(tituloConsultado.resumo, null, 2));
    } else {
        console.log('Título não encontrado na listagem');
    }



    // Comentando o cancelamento para ver no Omie
    // const cancelPayload = {
    //   call: "CancelarRecebimento",
    //   app_key: conf.app_key,
    //   app_secret: conf.app_secret,
    //   param: [{ codigo_baixa: resRec.data.codigo_baixa }]
    // };
    // await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', cancelPayload);
    // console.log('Baixa cancelada com sucesso.');

  } catch (error: any) {
    console.log("Error: ", error.response?.data || error.message || error);
  }
  
  process.exit(0);
}

run();
