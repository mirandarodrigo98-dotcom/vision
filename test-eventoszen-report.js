const { executeQuestorReport } = require('./src/app/actions/integrations/questor-syn');

async function test() {
  const result = await executeQuestorReport('EventosZen', {}, 'nrwexJSON');
  console.log('EventosZen via Report:', result);
}

test().catch(console.error);