import db from '../src/lib/db';

async function main() {
  const cached = (await db.query('SELECT data, updated_at FROM omie_dashboard_cache WHERE id = 1', [])).rows[0];
  if (cached) {
     console.log('Cache Date:', cached.updated_at);
     console.log('Cache Data Keys:', Object.keys(cached.data));
     if (cached.data.blocoCaixa) {
        console.log('blocoCaixa:', JSON.stringify(cached.data.blocoCaixa, null, 2));
     }
  } else {
     console.log('No cache found.');
  }
}
main().catch(console.error);
