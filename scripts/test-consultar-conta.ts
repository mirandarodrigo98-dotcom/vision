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
      const { listarContasReceber } = await import('../src/app/actions/integrations/omie');
      const res = await listarContasReceber('01/01/2026', '31/12/2026');
      const conta = res.data.find((c: any) => c.status_titulo === 'RECEBIDO');
      console.log("Conta:", conta?.codigo_lancamento_omie);
      console.log("Recebimentos da conta RECEBIDO:", conta?.recebimentos || conta?.recebimento || conta?.resumo);
}

testConsultarConta();