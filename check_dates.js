require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  const res = await client.query('SELECT id, dismissal_date, created_at, updated_at FROM dismissals');
  
  res.rows.forEach(r => {
    if (r.dismissal_date) {
      const d = new Date(r.dismissal_date);
      if (isNaN(d.getTime())) console.log("Invalid dismissal_date:", r.id, r.dismissal_date);
    }
    if (r.created_at) {
      const d = new Date(r.created_at);
      if (isNaN(d.getTime())) console.log("Invalid created_at:", r.id, r.created_at);
    }
    if (r.updated_at) {
      const d = new Date(r.updated_at);
      if (isNaN(d.getTime())) console.log("Invalid updated_at:", r.id, r.updated_at);
    }
  });
  
  console.log("Check complete.");
  await client.end();
}

run();