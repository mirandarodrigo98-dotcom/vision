const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const ssl = connectionString.includes('neon.tech') || connectionString.includes('sslmode=require')
  ? { rejectUnauthorized: false } 
  : undefined;

const pool = new Pool({
  connectionString,
  ssl,
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT * FROM users WHERE email = 'miranda.rodrigo98@gmail.com'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

run();