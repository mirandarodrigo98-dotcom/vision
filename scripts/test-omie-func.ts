import { downloadBoletoPdfServer } from './src/app/actions/integrations/omie';
import fs from 'fs';

async function run() {
  const url = 'https://app.omie.com.br/api/v1/financas/contareceber/boleto/?codigo_lancamento_omie=XXXXX'; // We just need a valid boleto url
}
run();