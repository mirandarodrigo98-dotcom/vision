require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT id, date FROM enuves_transactions LIMIT 1').then(res => {
  console.log(res.rows);
  pool.end();
}).catch(console.error);