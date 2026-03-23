import { searchEnuvesCompanies } from './src/app/actions/integrations/companies';

async function run() {
  const result = await searchEnuvesCompanies('CF DOS');
  console.log(result);
}

run();