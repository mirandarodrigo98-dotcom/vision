require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`SELECT role, password_hash FROM users WHERE email = $1 AND is_active = 1`, ['miranda.rodrigo98@gmail.com']);
    console.log(res.rows);
  } catch (err) {
    console.error(err.message);
  } finally {
    pool.end();
  }
}

run();