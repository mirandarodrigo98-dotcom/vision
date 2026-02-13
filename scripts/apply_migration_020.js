
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to database');

    const sqlPath = path.join(__dirname, '../src/db/migrations/020_add_integration_code_to_categories.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying migration 020...');
    await client.query(sql);
    console.log('Migration applied successfully');

  } catch (err) {
    if (err.code === '42701') {
        console.log('Column already exists, skipping.');
    } else {
        console.error('Error applying migration:', err);
    }
  } finally {
    await client.end();
  }
}

main();
