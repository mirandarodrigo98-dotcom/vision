const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbUrlMatch) process.env.DATABASE_URL = dbUrlMatch[1];
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(() => {
  client.query("SELECT id, title, company_id FROM tickets ORDER BY created_at DESC LIMIT 5").then(res => {
    console.log('tickets:', res.rows);
    const ids = res.rows.filter(r => r.company_id).map(r => `'${r.company_id}'`).join(',');
    if (ids) {
      client.query(`SELECT id, nome, razao_social FROM client_companies WHERE id IN (${ids})`).then(res2 => {
        console.log('companies:', res2.rows);
        client.end();
      });
    } else {
      client.end();
    }
  });
});
