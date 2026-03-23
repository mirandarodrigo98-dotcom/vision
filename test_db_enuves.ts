import { config } from 'dotenv';
config();
import { db } from './src/lib/db';
async function test() {
  try {
    const res = await db.prepare('SELECT id, date FROM enuves_transactions LIMIT 5').all();
    console.log("DB response:");
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
test();