const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
if (dbUrlMatch) process.env.DATABASE_URL = dbUrlMatch[1];
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(() => {
  client.query("SELECT id, razao_social, nome FROM client_companies WHERE UPPER(razao_social) LIKE '%NZD%' OR UPPER(nome) LIKE '%NZD%'").then(res => {
    console.log(res.rows);
    client.end();
  });
});
