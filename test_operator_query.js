require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  const q = 'SELECT d.* FROM dismissals d WHERE d.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1)';
  const res = await client.query(q, ['75b75f58-2346-4164-81e3-84a7732546a0']);
  console.log(res.rows.length);
  await client.end();
}

run();