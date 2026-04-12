import axios from 'axios';
import { getOmieConfig } from '../src/app/actions/integrations/omie-config';

async function main() {
  const config = await getOmieConfig();
  if (!config) return;
  const ccRes = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', {
      call: "ListarContasCorrentes",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ pagina: 1, registros_por_pagina: 50 }]
  });
  const contas = ccRes.data.ListarContasCorrentes || [];
  if (contas.length === 0) return;
  const nCodCC = contas[0].nIdCC || contas[0].nCodCC;

  const res = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', {
    call: "ListarExtrato",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{ nCodCC, dPeriodoInicial: "01/01/2026", dPeriodoFinal: "30/04/2026" }]
  }).catch(e => {
    if (e.response) {
       console.log('Error', e.response.data);
    }
  });
  if (res && res.data) {
    const arr = res.data.listaMovimentos || res.data.listaExtrato || res.data.extrato;
    if (arr && arr.length > 0) {
      console.log('Sample Extrato Item Keys:', Object.keys(arr[0]));
      console.log('Sample Extrato Item:', arr[0]);
    } else {
      console.log('No data found for this CC. Try another or just print the array:', arr);
    }
  }
}
main();
