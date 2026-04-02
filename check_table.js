const fs = require('fs');
const { Pool } = require('pg');

const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : process.env.DATABASE_URL;

const pool = new Pool({ connectionString: dbUrl });

async function run() {
  try {
    const res = await pool.query(`SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'ir_interactions'`);
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
