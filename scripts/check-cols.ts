import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'client_companies'
  `);
  console.log(res.rows.map(r => r.column_name));
  process.exit(0);
}
run();