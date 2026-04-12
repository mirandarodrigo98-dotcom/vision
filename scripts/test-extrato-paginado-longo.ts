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
  
  const nCodCC = contas.find((c: any) => c.descricao?.includes('Cora'))?.nIdCC || contas[0].nIdCC || contas[0].nCodCC;

  console.log(`Buscando extrato Cora para 01/03/2025 a 30/04/2026 (14 meses) PAGINADO...`);
  
  let page = 1;
  let totalPages = 1;
  let totalItems = 0;
  
  while (page <= totalPages) {
    const res = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', {
      call: "ListarExtrato",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ nCodCC, dPeriodoInicial: "01/03/2025", dPeriodoFinal: "30/04/2026", nPagina: page, nRegPorPagina: 500 }]
    }).catch(e => {
       console.log(`Error Page ${page}:`, e.response?.data);
       return null;
    });

    if (res && res.data) {
       totalPages = res.data.nTotPaginas || 1;
       const arr = res.data.listaMovimentos || [];
       totalItems += arr.length;
       console.log(`Page ${page}/${totalPages} - Items: ${arr.length}`);
    } else {
       break;
    }
    page++;
  }
  console.log('Total items fetched:', totalItems);
}
main();
