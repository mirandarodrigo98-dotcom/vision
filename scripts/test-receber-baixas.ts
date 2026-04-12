import axios from 'axios';
import { getOmieConfig } from '../src/app/actions/integrations/omie-config';

async function main() {
  const config = await getOmieConfig();
  if (!config) return;

  const payload = {
    call: "ListarBaixas",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      pagina: 1,
      registros_por_pagina: 10,
      nCodTitulo: 6674617304
    }]
  };

  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/baixa/', payload);
    console.log('Baixas:', JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.log('Error:', e.response?.data);
  }
}
main();
