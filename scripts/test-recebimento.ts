import axios from 'axios';
import { getOmieConfig } from '../src/app/actions/integrations/omie-config';

async function main() {
  const config = await getOmieConfig();
  if (!config) return;

  const payload = {
    call: "ListarLancamentosCC",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      pagina: 1,
      registros_por_pagina: 100,
      nCodCC: 6673818074,
      dDtIncDe: "01/08/2025",
      dDtIncAte: "31/08/2025"
    }]
  };

  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/financas/contacorrentelancamentos/', payload);
    const recs = res.data.listar_recebimentos || [];
    console.log(`Found ${recs.length} items using ListarRecebimentos`);
    if (recs.length > 0) {
      console.log('Sample Data:', recs[0]);
    }
  } catch (e: any) {
    console.log('Error:', e.response?.data);
  }
}
main();
