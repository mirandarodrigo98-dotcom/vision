require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`SELECT * FROM client_companies LIMIT 1`);
    console.log(res.rows[0]);
  } catch (err) {
    console.error(err.message);
  } finally {
    pool.end();
  }
}

run();