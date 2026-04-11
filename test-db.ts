import db from './src/lib/db';

async function test() {
  const comp = (await db.query(`SELECT code, nome FROM client_companies WHERE id = $1`, ['36ba042a-85a1-4214-9ced-fafba7277617'])).rows[0];
  console.log(comp);
  process.exit(0);
}

test();