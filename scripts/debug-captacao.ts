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

  const payloadOS = {
    call: "ListarOS",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      pagina: 1,
      registros_por_pagina: 500,
      filtrar_por_status: "F" // Faturadas
    }]
  };

  try {
    const payloadContratos = {
        call: "ListarContratos",
        app_key: config.app_key,
        app_secret: config.app_secret,
        param: [{ pagina: 1, registros_por_pagina: 500 }]
    };
    let contratos: any[] = [];
    let page = 1;
    let total = 1;
    while(page <= total) {
        payloadContratos.param[0].pagina = page;
        const res = await axios.post('https://app.omie.com.br/api/v1/servicos/contrato/', payloadContratos);
        total = res.data.total_de_paginas || 1;
        contratos.push(...(res.data.contratoCadastro || []));
        page++;
    }
    
    const clientData: Record<number, { minDate: Date | null, maxDate: Date | null, isActive: boolean }> = {};
    
    contratos.forEach((c:any) => {
        const cliId = c.cabecalho.nCodCli;
        const status = c.cabecalho.cCodSit;
        const dInc = c.cabecalho.dVigInicial;
        const dFim = c.cabecalho.dVigFinal;
        
        if (!cliId) return;
        
        if (!clientData[cliId]) {
            clientData[cliId] = { minDate: null, maxDate: null, isActive: false };
        }
        
        if (status === '10' || status === '20') {
            clientData[cliId].isActive = true;
        }
        
        if (dInc) {
            const p = dInc.split('/');
            const dt = new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
            if (!clientData[cliId].minDate || dt < clientData[cliId].minDate) {
                clientData[cliId].minDate = dt;
            }
        }
        
        if (dFim) {
            const p = dFim.split('/');
            const dt = new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
            if (!clientData[cliId].maxDate || dt > clientData[cliId].maxDate) {
                clientData[cliId].maxDate = dt;
            }
        }
    });

    let active = 0, inactive = 0;
    Object.values(clientData).forEach(v => {
        if (v.isActive) active++;
        else inactive++;
    });
    console.log(`Total clients: ${Object.keys(clientData).length} (Active: ${active}, Inactive: ${inactive})`);
    
    const sample = Object.values(clientData).find(c => !c.isActive);
    console.log('Sample inactive client:', sample);
    
  } catch (e: any) {
    console.log('Error:', e.response?.data);
  }
}
main();