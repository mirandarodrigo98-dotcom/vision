const fs = require('fs');
const { Pool } = require('pg');
const envContent = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : process.env.DATABASE_URL;
const pool = new Pool({ connectionString: dbUrl });

async function run() {
  try {
    await pool.query(`ALTER TABLE ir_interactions DROP CONSTRAINT IF EXISTS ir_interactions_type_check`);
    await pool.query(`ALTER TABLE ir_interactions ADD CONSTRAINT ir_interactions_type_check CHECK (type IN ('comment', 'status_change', 'priority_change', 'creation', 'document'))`);
    console.log("Constraint updated successfully");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
