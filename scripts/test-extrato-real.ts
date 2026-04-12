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
  
  for (const cc of contas) {
    const nCodCC = cc.nIdCC || cc.nCodCC;
    const res = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', {
      call: "ListarExtrato",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ nCodCC, dPeriodoInicial: "01/01/2026", dPeriodoFinal: "30/04/2026" }]
    }).catch(e => null);
    
    if (res && res.data) {
      const arr = res.data.listaMovimentos || res.data.listaExtrato || res.data.extrato;
      if (arr && arr.length > 0) {
        const realMovs = arr.filter((x: any) => x.cDesCliente !== 'SALDO ANTERIOR' && x.cDesCliente !== 'SALDO');
        if (realMovs.length > 0) {
          console.log(`Found real movs in CC ${nCodCC} - ${cc.descricao}`);
          console.log('Sample Extrato Item Keys:', Object.keys(realMovs[0]));
          console.log('Sample Extrato Item:', realMovs[0]);
          return;
        }
      }
    }
  }
  console.log('No real transactions found in this range. Trying wider range...');
}
main();
