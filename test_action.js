const { fetchQuestorEmployees } = require('./.next/server/app/actions/employees.js');

async function test() {
  const result = await fetchQuestorEmployees('1'); // Try NZD or something
  console.log(result);
}
test();
