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
    call: "ListarExtrato",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      nCodCC: 7016916698,
      dPeriodoInicial: "01/04/2026",
      dPeriodoFinal: "30/04/2026"
    }]
  };

  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', payload);
    const extrato = res.data.listaMovimentos || [];
    console.log('Total Extrato:', extrato.length);
    
    let totalR = 0;
    const counts: any = {};
    let totalRecebidos = 0;
    extrato.forEach((m: any) => {
        if (m.cNatureza === 'R') {
            totalR += m.nValorDocumento || 0;
            if (m.cSituacao?.toLowerCase() !== 'previsto') {
                totalRecebidos += m.nValorDocumento || 0;
            }
            const st = m.cSituacao || 'N/A';
            counts[st] = (counts[st] || 0) + 1;
        }
    });
    console.log('Total Receitas:', totalR);
    console.log('Total Recebidos (Sem Previsto):', totalRecebidos);
    console.log('Status Counts:', counts);
    
    if (extrato.length > 0) {
        const sorted = extrato.filter((m:any) => m.cNatureza === 'R').sort((a:any, b:any) => {
            const da = a.dDataLancamento.split('/').reverse().join('');
            const db = b.dDataLancamento.split('/').reverse().join('');
            return db.localeCompare(da);
        });
        console.log('Max Date R:', sorted[0]?.dDataLancamento, 'Min Date R:', sorted[sorted.length-1]?.dDataLancamento);
        console.log('Sample R (Latest):', JSON.stringify(sorted[0], null, 2));
    }
  } catch (e: any) {
    console.log('Error:', e.response?.data);
  }
}
main();