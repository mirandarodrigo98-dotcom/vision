const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function findBoletoUrlInDb() {
  // Let's check if there are any boletos stored in the DB or if we can get the exact URL from the frontend actions.
  // Actually, omie_recebimentos stores omie invoices. Does it store cLinkBoleto?
  const res = await pool.query('SELECT * FROM omie_recebimentos LIMIT 10');
  console.log(res.rows[0]);
  pool.end();
}
findBoletoUrlInDb();