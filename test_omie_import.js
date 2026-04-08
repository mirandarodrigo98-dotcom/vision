const { listarContasReceber } = require('./src/app/actions/integrations/omie');

async function test() {
  const result = await listarContasReceber("01/03/2026", "31/03/2026");
  console.log(result.data?.[0]);
  const recebido = result.data?.find(c => c.status_titulo === 'RECEBIDO');
  console.log(recebido);
}
test();