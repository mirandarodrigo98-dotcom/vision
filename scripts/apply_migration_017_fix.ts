
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') || process.env.DATABASE_URL?.includes('neon.tech') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running migration 017 fix...');
    
    // Add status column
    try {
        await client.query("ALTER TABLE employees ADD COLUMN status TEXT DEFAULT 'Admitido';");
        console.log('Added status column.');
    } catch (e: any) {
        if (e.code === '42701') { // duplicate_column
            console.log('status column already exists.');
        } else {
            console.error('Error adding status:', e);
        }
    }

    // Update existing status to Admitido if null (if it existed but was empty)
    try {
        await client.query("UPDATE employees SET status = 'Admitido' WHERE status IS NULL;");
        console.log('Updated status to Admitido for NULL values.');
    } catch (e) {
        console.error('Error updating status:', e);
    }

    console.log('Migration completed.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
