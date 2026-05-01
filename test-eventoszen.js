const fetch = require('node-fetch');
const db = require('./src/lib/db').default;
const { executeQuestorProcess } = require('./src/app/actions/integrations/questor-syn');

async function test() {
  const result = await executeQuestorProcess('EventosZen', {});
  console.log(result);
}

test().catch(console.error);