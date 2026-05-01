const { executeQuestorProcess } = require('./src/app/actions/integrations/questor-syn');

async function test() {
  const result = await executeQuestorProcess('EmpresasVision', { "E.CODIGOEMPRESA": "1" });
  console.log('EmpresasVision:', result);
}

test().catch(console.error);