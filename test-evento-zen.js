const fetch = require('node-fetch');
const db = require('./src/lib/db').default;

async function test() {
  const config = (await db.query('SELECT * FROM questor_syn_config WHERE id = 1')).rows[0];
  const url = config.internal_url || config.base_url;
  
  const b64Filter = Buffer.from(JSON.stringify([{Campo: 'CODIGOEMPRESA', Valor: 1}])).toString('base64');
  const targetUrl = `${url.replace(/\/$/, '')}/TnWebDMConsulta/Pegar?_AActionName=TnFpaDMEventoZEN&TokenApi=${config.api_token}&_AiDisplayStart=0&_AiDisplayLength=10&_AsEcho=JSON&_AFilter=${b64Filter}`;
  
  try {
    const res = await fetch(targetUrl);
    console.log(await res.text());
  } catch(e) {}
}

test().catch(console.error);