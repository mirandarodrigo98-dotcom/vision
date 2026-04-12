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
    call: "ListarContratos",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      pagina: 1,
      registros_por_pagina: 500
    }]
  };

  try {
    let contratos: any[] = [];
    let total = 1;
    let page = 1;
    while(page <= total) {
        payload.param[0].pagina = page;
        const res = await axios.post('https://app.omie.com.br/api/v1/servicos/contrato/', payload);
        total = res.data.total_de_paginas || 1;
        contratos.push(...(res.data.contratoCadastro || []));
        page++;
    }
    
    console.log('Total Contratos:', contratos.length);
    const inativos = contratos.filter((c:any) => c.cabecalho.cCodSit !== '10' && c.cabecalho.cCodSit !== '20');
    console.log('Inativos:', inativos.length);
    if (inativos.length > 0) {
        console.log('Sample Inativo Cabecalho:', JSON.stringify(inativos[0].cabecalho, null, 2));
        console.log('Sample Inativo InfoCadastro:', JSON.stringify(inativos[0].infoCadastro, null, 2));
        console.log('Sample Inativo full keys:', Object.keys(inativos[0]));
    }
  } catch (e: any) {
    console.log('Error:', e.response?.data);
  }
}
main();