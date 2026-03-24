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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Adding priority and cpf columns to ir_declarations...');
    await client.query(`
      ALTER TABLE ir_declarations
      ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'Média',
      ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
    `);

    await client.query('COMMIT');
    console.log('Migration 051 completed successfully!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
