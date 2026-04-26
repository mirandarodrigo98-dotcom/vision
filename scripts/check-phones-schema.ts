import db from '../src/lib/db';

async function run() {
  const r1 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'company_phones'");
  const r2 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contact_categories'");
  console.log('Phones:', r1.rows);
  console.log('Categories:', r2.rows);
  process.exit(0);
}

run();