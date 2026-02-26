import db from '../lib/db';

async function checkCompany() {
  const schema = await db.prepare("SELECT column_name FROM information_schema.columns WHERE table_name = 'enuves_transactions'").all();
  console.log(schema);
}

checkCompany();
