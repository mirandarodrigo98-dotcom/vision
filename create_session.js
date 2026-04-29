require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  const sessionId = 'test-session-flavia';
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await client.query('INSERT INTO sessions (id, user_id, role, expires_at) VALUES ($1, $2, $3, $4)', [sessionId, '4dee6d0d-a907-4146-bf8b-683b87de1e07', 'operator', expiresAt]);
  console.log('Session created');
  await client.end();
}

run();