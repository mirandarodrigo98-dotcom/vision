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
  }).catch(e => {
      console.log('Error CC:', e.response?.data);
      return { data: { ListarContasCorrentes: [{ nIdCC: 6673818074 }] } }; // fallback to known Cora CC if rate limited
  });
  const contas = ccRes.data.ListarContasCorrentes || [];
  if (contas.length === 0) return;
  
  const nCodCC = contas.find((c: any) => c.descricao?.includes('Cora'))?.nIdCC || contas[0].nIdCC || contas[0].nCodCC;

  console.log(`Buscando extrato Cora para 01/03/2025 a 30/04/2026 (14 meses)...`);
  const res = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', {
    call: "ListarExtrato",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{ nCodCC, dPeriodoInicial: "01/05/2025", dPeriodoFinal: "31/12/2025" }]
  }).catch(e => {
     console.log('Error:', e.response?.data);
     return null;
  });

  if (res && res.data) {
     const arr = res.data.listaMovimentos || [];
     console.log('Total items:', arr.length);
     
     const counts = {};
     arr.forEach((m: any) => {
       const [d, mo, y] = (m.dDataLancamento||'').split('/');
       if (y && mo) counts[`${y}-${mo}`] = (counts[`${y}-${mo}`] || 0) + 1;
     });
     console.log('Distribution:', counts);
  }
}
main();
