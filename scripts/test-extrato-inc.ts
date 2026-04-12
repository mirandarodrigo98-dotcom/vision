import axios from 'axios';
import { getOmieConfig } from '../src/app/actions/integrations/omie-config';

async function main() {
  const config = await getOmieConfig();
  if (!config) return;

  const payload = {
    call: "ListarExtrato",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      nCodCC: 6673818074,
      dPeriodoInicial: "01/01/2020",
      dPeriodoFinal: "31/12/2026",
      dDataInclusaoInicial: "13/08/2025"
    }]
  };

  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', payload);
    const extrato = res.data.listaMovimentos || [];
    console.log(`Found ${extrato.length} items`);
  } catch (e: any) {
    console.log('Error:', e.response?.data);
  }
}
main();
