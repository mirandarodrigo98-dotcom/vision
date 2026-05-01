import db from './src/lib/db';
async function main() {
  const res = await db.query('SELECT * FROM questor_syn_routines');
  console.log(res.rows);
}
main();