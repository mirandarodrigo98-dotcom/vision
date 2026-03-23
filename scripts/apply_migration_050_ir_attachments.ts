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

    console.log('Creating ir_attachments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ir_attachments (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        interaction_id TEXT REFERENCES ir_interactions(id) ON DELETE CASCADE,
        original_name TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('Migration 050 completed successfully!');
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