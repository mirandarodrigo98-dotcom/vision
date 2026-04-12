import axios from 'axios';
import { getOmieConfig } from '../src/app/actions/integrations/omie-config';

async function main() {
  const config = await getOmieConfig();
  if (!config) return;

  const payload = {
    call: "ListarContasReceber",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      pagina: 1,
      registros_por_pagina: 100,
      filtrar_por_data_pagamento_de: "01/08/2025",
      filtrar_por_data_pagamento_ate: "31/08/2025"
    }]
  };

  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', {
      call: "ListarContasReceber",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{
        pagina: 1,
        registros_por_pagina: 100,
        filtrar_por_data_de: "01/08/2025",
        filtrar_por_data_ate: "31/08/2025",
        filtrar_apenas_inclusao: "N",
        filtrar_por_status: "LIQUIDADO"
      }]
    });
    const contas = res.data.conta_receber_cadastro || [];
    console.log(`Found ${contas.length} items using data_pagamento`);
    if (contas.length > 0) {
      console.log('Sample Keys:', Object.keys(contas[0]));
      // let's check the fields that could have the payment date
      console.log('Sample fields:', {
        data_emissao: contas[0].data_emissao,
        data_previsao: contas[0].data_previsao,
        data_vencimento: contas[0].data_vencimento,
        info_dAlt: contas[0].info?.dAlt,
        info_dInc: contas[0].info?.dInc
      });
      // The problem is that ListarContasReceber returns the BILL date via filtrar_por_data_de, NOT the payment date.
    }
  } catch (e: any) {
    console.log('Error 1:', e.response?.data);
  }

  // let's try with data_baixa_de
}
main();
