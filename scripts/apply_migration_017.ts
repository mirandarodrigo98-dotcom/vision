
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file in root
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
    console.log('Running migration 017...');
    
    // Add dismissal_date
    try {
        await client.query("ALTER TABLE employees ADD COLUMN dismissal_date TEXT;");
        console.log('Added dismissal_date column.');
    } catch (e: any) {
        if (e.code === '42701') { // duplicate_column
            console.log('dismissal_date column already exists.');
        } else {
            console.error('Error adding dismissal_date:', e);
        }
    }

    // Add transfer_date
    try {
        await client.query("ALTER TABLE employees ADD COLUMN transfer_date TEXT;");
        console.log('Added transfer_date column.');
    } catch (e: any) {
        if (e.code === '42701') { // duplicate_column
            console.log('transfer_date column already exists.');
        } else {
            console.error('Error adding transfer_date:', e);
        }
    }

    // Update status
    try {
        await client.query("UPDATE employees SET status = 'Admitido' WHERE status = 'ACTIVE' OR status IS NULL;");
        console.log('Updated existing status to Admitido.');
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
