import axios from 'axios';
import { getOmieConfig } from '../src/app/actions/integrations/omie-config';

async function main() {
  const config = await getOmieConfig();
  if (!config) return;

  const payload = {
    call: "ListarFaturamento",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      pagina: 1,
      registros_por_pagina: 100,
      cMes: "08",
      cAno: "2025"
    }]
  };

  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/servicos/contrato/', {
      call: "ListarContratos",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{
        pagina: 1,
        registros_por_pagina: 2
      }]
    });
    console.log('Sample Contrato:', JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.log('Error:', e.response?.data);
  }
}
main();
