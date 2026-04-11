import axios from 'axios';
import { getOmieConfig } from '../src/app/actions/integrations/omie-config';

async function testExtrato() {
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
    
    console.log("Active CC IDs:", contasAtivasIds);

    if (contasAtivasIds.length === 0) return;

    for (const nCodCC of contasAtivasIds) {
        const payload = {
            call: "ListarExtrato",
            app_key: config.app_key,
            app_secret: config.app_secret,
            param: [{
                nCodCC: nCodCC,
                dPeriodoInicial: "01/01/2024",
                dPeriodoFinal: "31/12/2024"
            }]
        };
        try {
            const res = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', payload);
            const movimentos = res.data.listaMovimentos || [];
            console.log(`CC ${nCodCC} - Movimentos count: ${movimentos.length}`);
            const real = movimentos.find(m => m.cDesCliente !== 'SALDO' && m.cDesCliente !== 'SALDO ANTERIOR');
            if (real) {
                console.log(`Real item CC ${nCodCC}:`, real);
                break;
            }
        } catch (e: any) {
            console.error(`Erro CC ${nCodCC}:`, e.response?.data?.faultstring || e.message);
        }
    }
}

testExtrato();