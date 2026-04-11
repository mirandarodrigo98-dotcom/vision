import axios from 'axios';
import { getOmieConfig } from '../src/app/actions/integrations/omie-config';

async function testAbril2026() {
    const config = await getOmieConfig();
    const payloadCc = {
      call: "ListarContasCorrentes",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ pagina: 1, registros_por_pagina: 500 }]
    };
    const resCc = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', payloadCc);
    const ccList = resCc.data.ListarContasCorrentes || [];
    const CONTAS_ATIVAS = ['Cora', 'Inter', 'Itaú', 'Caixa Econômica', 'Caixinha'];
    const contasAtivasIds: number[] = [];
    ccList.forEach((cc: any) => {
      const nome = cc.descricao || cc.cDescricao || '';
      if (CONTAS_ATIVAS.some(c => nome.toLowerCase().includes(c.toLowerCase()))) {
        contasAtivasIds.push(cc.nIdCC || cc.nCodCC);
      }
    });
    console.log("Contas ativas:", contasAtivasIds);

    const CATEGORIAS_RECEITAS_TOTAIS = [
      'Honorários Contábeis', 'Honorários Contábeis Anual', 'Sistemas', 
      'Certificado Digital', 'Honorários Doméstica', 'Comissões', 
      'Legalização', 'Imposto de Renda', 'MEI', 'Honorários Renegociados', 
      'Perícia', 'Serviços Avulsos', 'BPO Financeiro'
    ];

    let totalAbril = 0;

    for (const nCodCC of contasAtivasIds) {
        const payload = {
            call: "ListarExtrato",
            app_key: config.app_key,
            app_secret: config.app_secret,
            param: [{
                nCodCC: nCodCC,
                dPeriodoInicial: "01/04/2026",
                dPeriodoFinal: "30/04/2026"
            }]
        };
        try {
            const res = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', payload);
            const extrato = res.data.listaMovimentos || res.data.listaExtrato || res.data.extrato || [];
            
            const receitas = extrato.filter((item: any) => {
                if (item.cDesCliente === 'SALDO' || item.cDesCliente === 'SALDO ANTERIOR' || !item.cDesCategoria) return false;
                const valor = item.nValorDocumento || 0;
                if (valor <= 0) return false;
                
                const categoria = item.cDesCategoria || '';
                const catMatch = CATEGORIAS_RECEITAS_TOTAIS.some(c => categoria.toLowerCase().includes(c.toLowerCase()));
                if (!catMatch) return false;

                // Test nature
                if (item.cNatureza && item.cNatureza !== 'R') {
                    console.log(`Despesa com valor positivo filtrada (não deveria somar):`, item.nValorDocumento, item.cDesCategoria, item.cNatureza);
                    // we currently DO NOT filter by cNatureza, so this would be summed!
                }
                
                return true;
            });
            
            receitas.forEach((r: any) => {
                totalAbril += r.nValorDocumento;
                console.log(`Receita Abril 2026 [CC ${nCodCC}]:`, r.nValorDocumento, r.cDesCategoria, r.cNatureza);
            });
        } catch (e: any) {
            console.error(`Erro CC ${nCodCC}:`, e.response?.data?.faultstring || e.message);
        }
    }
    
    console.log("Total Abril 2026 calculado pelo script:", totalAbril);
}

testAbril2026();