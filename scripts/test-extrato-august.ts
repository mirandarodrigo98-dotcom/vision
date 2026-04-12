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
  
  let totalAgosto = 0;
  
  for (const cc of contas) {
    const nCodCC = cc.nIdCC || cc.nCodCC;
    const nomeCC = cc.descricao || cc.cDescricao || '';
    
    // Filtro de CONTAS_ATIVAS
    const CONTAS_ATIVAS = ['Cora', 'Inter', 'Itaú', 'Caixa Econômica', 'Caixinha'];
    if (!CONTAS_ATIVAS.some(c => nomeCC.toLowerCase().includes(c.toLowerCase()))) {
      continue;
    }
    
    let totalPages = 1;
    let currentPage = 1;
    
    while (currentPage <= totalPages) {
      const res = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', {
        call: "ListarExtrato",
        app_key: config.app_key,
        app_secret: config.app_secret,
        param: [{ nCodCC, dPeriodoInicial: "01/08/2025", dPeriodoFinal: "31/08/2025" }]
      }).catch(e => {
         // console.log(`Error CC ${nomeCC}:`, e.response?.data);
         return null;
      });

      if (res && res.data) {
         totalPages = res.data.nTotPaginas || 1;
         const arr = res.data.listaMovimentos || res.data.listaExtrato || res.data.extrato || [];
         
         const receitas = arr.filter((item: any) => {
           if (item.cDesCliente === 'SALDO' || item.cDesCliente === 'SALDO ANTERIOR' || !item.cDesCategoria) return false;
           if (item.cNatureza && item.cNatureza !== 'R') return false; 
           const valor = item.nValorDocumento || 0;
           if (valor <= 0) return false; 
           const categoria = item.cDesCategoria || '';
           const CATEGORIAS_RECEITAS_TOTAIS = [
              'Honorários Contábeis', 'Honorários Contábeis Anual', 'Sistemas', 
              'Certificado Digital', 'Honorários Doméstica', 'Comissões', 
              'Legalização', 'Imposto de Renda', 'MEI', 'Honorários Renegociados', 
              'Perícia', 'Serviços Avulsos', 'BPO Financeiro'
           ];
           return CATEGORIAS_RECEITAS_TOTAIS.some(c => categoria.toLowerCase().includes(c.toLowerCase()));
         });
         
         const sum = receitas.reduce((acc: number, cur: any) => acc + (cur.nValorDocumento || 0), 0);
         totalAgosto += sum;
         console.log(`CC ${nomeCC} - Page ${currentPage}: ${receitas.length} receitas, Sum: ${sum}`);
      } else {
        // console.log(`No data for CC ${nomeCC}`);
      }
      currentPage++;
    }
  }
  console.log(`Total Receitas Agosto 2025: ${totalAgosto}`);
}
main();
