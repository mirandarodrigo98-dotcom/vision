import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Try loading from .env and .env.local
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function migrate() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL is not defined in environment variables or .env files.');
        process.exit(1);
    }

    console.log('Database URL found (length):', dbUrl.length);
    
    // Fix for "SECURITY WARNING" similar to db.ts
    let connectionString = dbUrl;
    if (connectionString.includes('sslmode=require')) {
        connectionString = connectionString.replace('?sslmode=require', '').replace('&sslmode=require', '');
    }

    const pool = new Pool({
        connectionString: connectionString,
        ssl: (dbUrl.includes('neon.tech') || process.env.NODE_ENV === 'production') 
            ? { rejectUnauthorized: false } 
            : undefined
    });

    const sqlPath = path.join(process.cwd(), 'src/db/migrations/040_add_access_schedules_pg.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error('Migration file not found at:', sqlPath);
        process.exit(1);
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...');
    try {
        await pool.query(sql);
        console.log('Migration successful.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}

migrate();
