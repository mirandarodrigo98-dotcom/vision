const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

async function applySchema() {
  const pgUrl = process.env.DATABASE_URL;
  if (!pgUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL to apply schema...');
  const pool = new Pool({
    connectionString: pgUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    try {
      const schemaPath = path.join(__dirname, '..', 'postgres-schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      console.log('Applying schema...');
      await client.query(schemaSql);
      console.log('Schema applied successfully!');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Failed to apply schema:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applySchema();
