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
    call: "ListarOS",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      pagina: 1,
      registros_por_pagina: 10,
      filtrar_por_data_faturamento_de: "01/03/2026",
      filtrar_por_data_faturamento_ate: "31/03/2026",
      filtrar_por_status: "F"
    }]
  };

  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/servicos/os/', payload);
    console.log('ListarOS keys:', Object.keys(res.data));
    console.log('ListarOS count:', res.data.osCadastro?.length);
    if (res.data.osCadastro?.length > 0) {
      console.log('Sample OS Cabecalho:', JSON.stringify(res.data.osCadastro[0].Cabecalho, null, 2));
      console.log('Sample OS Status:', res.data.osCadastro[0].Cabecalho?.cEtapa);
    }
  } catch (e: any) {
    console.log('Error OS:', e.response?.data);
  }
}
main();