const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration(file) {
  const filePath = path.join(__dirname, '..', 'src', 'db', 'migrations', file);
  console.log(`Applying ${file}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  let sql = fs.readFileSync(filePath, 'utf8');
  
  // Basic SQLite -> Postgres adjustments if needed (though 033/036 seem safe)
  // Just in case:
  sql = sql.replace(/DATETIME/gi, 'TIMESTAMP');
  
  try {
    await pool.query(sql);
    console.log(`Success: ${file}`);
  } catch (e) {
    console.error(`Error applying ${file}:`, e.message);
    // 42P07: duplicate_table
    // 42701: duplicate_column
    if (e.code === '42P07') console.log('Table already exists (ignoring)');
    else if (e.code === '42701') console.log('Column already exists (ignoring)');
  }
}

async function run() {
  try {
    console.log('Connecting to Postgres...');
    await pool.query('SELECT 1');
    console.log('Connected.');
    
    await runMigration('033_create_simples_nacional_billing.sql');
    await runMigration('036_add_urls_to_questor_config.sql');
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    pool.end();
  }
}

run();