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

  const payloadNfse = {
    call: "ListarNFSEs",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      nPagina: 1,
      nRegPorPagina: 10,
      dEmiInicial: "01/01/2025",
      dEmiFinal: "31/12/2026",
      cStatusNFSe: "F"
    }]
  };

  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/servicos/nfse/', payloadNfse);
    console.log('ListarNfse keys:', Object.keys(res.data));
    const nfses = res.data.nfseEncontradas || [];
    if (nfses.length > 0) {
        console.log('Sample NFSe:', JSON.stringify(nfses[0], null, 2));
    } else {
        console.log('No nfse found.');
    }
  } catch (e: any) {
    console.log('Error NFSe:', e.response?.data);
  }
}
main();