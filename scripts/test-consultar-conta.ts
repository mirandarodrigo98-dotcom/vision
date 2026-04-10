import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2];
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.replace(/\r/g, '');
    }
  });
}

async function testConsultarConta() {
      const axios = (await import('axios')).default;
      const conf = await (await import('../src/app/actions/integrations/omie-config')).getOmieConfig();
      const payloadList = {
         call: "CancelarRecebimento",
         app_key: conf.app_key,
         app_secret: conf.app_secret,
         param: [{ codigo_lancamento: 7150658233 }]
     };
     try {
         const axiosRes = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payloadList);
         console.log(JSON.stringify(axiosRes.data, null, 2));
     } catch (e: any) {
         console.log("Error:", e.response?.data || e.message);
     }
}

testConsultarConta();