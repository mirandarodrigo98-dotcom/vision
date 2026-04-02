const fs = require('fs');
const { Pool } = require('pg');
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : process.env.DATABASE_URL;
const pool = new Pool({ connectionString: dbUrl });

async function run() {
  try {
    const res = await pool.query(`SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'ir_interactions'::regclass`);
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
