import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
      const val = match[2].replace(/"/g, '').trim();
      process.env[match[1]] = val;
  }
});

async function main() {
  const axios = (await import('axios')).default;
  const { getOmieConfig } = await import('../src/app/actions/integrations/omie-config');
  const config = await getOmieConfig();
  if (!config) return;

  const payload = {
    call: "ListarOS",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      pagina: 1,
      registros_por_pagina: 500,
      filtrar_por_data_faturamento_de: "01/03/2026",
      filtrar_por_data_faturamento_ate: "31/03/2026",
      filtrar_por_status: "F"
    }]
  };

  try {
    let oss: any[] = [];
    let total = 1;
    let page = 1;
    while(page <= total) {
        payload.param[0].pagina = page;
        const res = await axios.post('https://app.omie.com.br/api/v1/servicos/os/', payload);
        total = res.data.total_de_paginas;
        oss.push(...(res.data.osCadastro || []));
        page++;
    }
    
    console.log('Total OSs:', oss.length);
    let totalValue = 0;
    
    // Group by status
    const statusCount: any = {};
    oss.forEach((os: any) => {
        const cEtapa = os.Cabecalho?.cEtapa || 'N/A';
        statusCount[cEtapa] = (statusCount[cEtapa] || 0) + 1;
        totalValue += (os.Cabecalho?.nValorTotal || 0);
    });
    console.log('OSs by cEtapa:', statusCount);
    console.log('Total Value:', totalValue);

    const valid = oss.filter((os: any) => os.InfoCadastro?.cCancelada !== 'S');
    const canceled = oss.filter((os: any) => os.InfoCadastro?.cCancelada === 'S');
    
    let totalValidValue = 0;
    valid.forEach((os: any) => { totalValidValue += (os.Cabecalho?.nValorTotal || 0); });
    
    let totalCanceledValue = 0;
    canceled.forEach((os: any) => { totalCanceledValue += (os.Cabecalho?.nValorTotal || 0); });

    console.log('Valid OSs:', valid.length, 'Value:', totalValidValue);
    console.log('Canceled OSs:', canceled.length, 'Value:', totalCanceledValue);

  } catch (e: any) {
    console.log('Error:', e.response?.data);
  }
}
main();