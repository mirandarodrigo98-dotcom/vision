import { getTransactions } from './src/app/actions/integrations/enuves';
async function test() {
  const res = await getTransactions('c223c6f0-6a75-4f4f-b677-2b834ab03233'); 
  console.log('first tx:', res[0]);
}
test();