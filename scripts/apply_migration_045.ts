
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

async function migrate() {
    console.log('Starting migration 045 (Create notifications table)...');
    const sqlPath = path.join(process.cwd(), 'src/db/migrations/045_create_notifications.sql');
    
    if (!fs.existsSync(sqlPath)) {
        console.error('Migration file not found:', sqlPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        // Split statements by semicolon
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

        for (const statement of statements) {
            if (statement.trim()) {
                console.log('Executing:', statement.trim());
                await db.prepare(statement).run();
            }
        }
        console.log('Migration 045 successful.');
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

migrate();
