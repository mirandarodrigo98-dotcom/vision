require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  const res = await client.query('SELECT id, dismissal_date FROM dismissals');
  
  res.rows.forEach(r => {
    try {
      if (r.dismissal_date) {
        new Date(r.dismissal_date).toISOString();
      }
    } catch(e) {
      console.log("Invalid date for id:", r.id, "value:", `'${r.dismissal_date}'`);
    }
  });
  
  console.log("Check complete.");
  await client.end();
}

run();