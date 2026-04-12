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
    call: "ListarRecibo",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      nPagina: 1,
      nRegPorPagina: 10
    }]
  };

  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/financas/recibo/', payload);
    console.log('Keys:', Object.keys(res.data));
    const list = res.data.recibo || res.data.lista_recibos || res.data.reciboEncontrados || [];
    console.log('Recibos length:', list.length);
    if (list.length > 0) {
        console.log('Sample:', JSON.stringify(list[0], null, 2));
    }
  } catch (e: any) {
    console.log('Error:', e.response?.data || e.message);
  }
}
main();