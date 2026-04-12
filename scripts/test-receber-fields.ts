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
      registros_por_pagina: 10,
      filtrar_por_status: "LIQUIDADO"
    }]
  };

  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload);
    const contas = res.data.conta_receber_cadastro || [];
    console.log(`Found ${contas.length} items`);
    if (contas.length > 0) {
      contas.forEach((c: any) => {
        console.log(`id_origem: ${c.id_origem}, valor: ${c.valor_documento}, data: ${c.data_previsao}`);
      });
    }
  } catch (e: any) {
    console.log('Error:', e.response?.data);
  }
}
main();
