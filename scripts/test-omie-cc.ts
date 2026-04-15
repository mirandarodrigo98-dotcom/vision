import axios from 'axios';
import { getOmieConfig } from '../src/app/actions/integrations/omie-config';

async function main() {
    const config = await getOmieConfig();
    const payloadCc = {
      call: "ListarContasCorrentes",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ pagina: 1, registros_por_pagina: 500 }]
    };
    const resCc = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', payloadCc);
    const ccList = resCc.data.ListarContasCorrentes || [];
    
    const targetBanks = ccList.filter((cc: any) => {
        const nome = cc.descricao || cc.cDescricao || '';
        return nome.toLowerCase().includes('itaú') || nome.toLowerCase().includes('itau') || nome.toLowerCase().includes('inter');
    });

    console.log(JSON.stringify(targetBanks, null, 2));
}
main();