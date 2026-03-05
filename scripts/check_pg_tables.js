require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables in Postgres:', res.rows.map(r => r.table_name));
    
    // Check specific columns in questor_syn_config
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'questor_syn_config';
    `);
    console.log('Columns in questor_syn_config:', columns.rows.map(r => r.column_name));

  } catch (err) {
    console.error('Error checking tables:', err);
  } finally {
    client.release();
    pool.end();
  }
}

checkTables();