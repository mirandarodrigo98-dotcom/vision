import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf-8');
const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1] : null;

if (!dbUrl) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

async function run() {
  const pool = new Pool({ connectionString: dbUrl });
  try {
    await pool.query('ALTER TABLE users ADD COLUMN receive_ticket_messages INTEGER DEFAULT 0;');
    console.log('Migration applied.');
  } catch (e: any) {
    if (e.code === '42701') console.log('Column already exists.');
    else console.error(e);
  }
  process.exit(0);
}
run();