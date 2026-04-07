const { Pool } = require('pg');
const fs = require('fs');
const envVars = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const eqIdx = line.indexOf('=');
  if (eqIdx > 0) acc[line.substring(0, eqIdx).trim()] = line.substring(eqIdx + 1).trim().replace(/^"|"$/g, '');
  return acc;
}, {});
const pool = new Pool({ connectionString: envVars.DATABASE_URL.replace('?sslmode=require', ''), ssl: { rejectUnauthorized: false } });

async function test() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS omie_config (
        id SERIAL PRIMARY KEY,
        app_key VARCHAR(255),
        app_secret VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Table created!");
    const res = await pool.query('SELECT * FROM omie_config');
    console.log("Rows:", res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
test();