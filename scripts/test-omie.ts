import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2];
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.replace(/\r/g, '');
    }
  });
}

// Now dynamic import to ensure process.env is set
async function run() {
  const { enviarBoletoDigisacOmie } = await import('../src/app/actions/integrations/omie');
  const { getOmieConfig } = await import('../src/app/actions/integrations/omie-config');
  const axios = (await import('axios')).default;

  console.log("Starting test...");
  const conf = await getOmieConfig();
  if (!conf) return console.log("No config");

  try {
    const payloadList = {
      call: "ListarContasReceber",
      app_key: conf.app_key,
      app_secret: conf.app_secret,
      param: [{
        pagina: 1, registros_por_pagina: 10, apenas_importado_api: "N",
        filtrar_por_data_de: "01/03/2026", filtrar_por_data_ate: "31/03/2026", filtrar_apenas_inclusao: "N"
      }]
    };
    const resList = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payloadList);
    const rec = resList.data.conta_receber_cadastro[0];
    
    if (!rec) return console.log("No rec");
    
    console.log("Testing with account: ", rec.codigo_lancamento_omie);
    rec.cnpj_cliente = '52.914.393/0001-42'; // Mock CNPJ
    const res = await enviarBoletoDigisacOmie(rec);
    console.log(res);

  } catch (error: any) {
    console.log("Error: ", error.message || error);
  }
  
  process.exit(0);
}

run();
