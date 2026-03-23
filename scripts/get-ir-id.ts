import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: dbUrl,
});

async function main() {
  const result = await pool.query('SELECT id FROM ir_declarations LIMIT 1');
  console.log(result.rows);
  process.exit(0);
}

main().catch(console.error);
