import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
      const val = match[2].replace(/"/g, '').trim();
      process.env[match[1]] = val;
  }
});

async function main() {
  const axios = (await import('axios')).default;
  const { getOmieConfig } = await import('../src/app/actions/integrations/omie-config');
  const config = await getOmieConfig();
  if (!config) return;

  const payload = {
    call: "ListarContratos",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      pagina: 1,
      registros_por_pagina: 50
    }]
  };

  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/servicos/contrato/', payload);
    const contratos = res.data.contratoCadastro || [];
    console.log('Total Contratos fetched:', contratos.length);
    if (contratos.length > 0) {
        console.log('Sample Contrato Status:', contratos.map((c:any) => c.cabecalho.cCodSit));
        console.log('Sample Contrato:', JSON.stringify(contratos[0], null, 2));
    }
  } catch (e: any) {
    console.log('Error:', e.response?.data);
  }
}
main();