import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

async function migrate() {
    console.log('Starting migration 042...');
    const sqlPath = path.join(process.cwd(), 'src/db/migrations/042_add_company_id_to_tickets.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        // Split statements by semicolon
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

        for (const statement of statements) {
            if (statement.trim()) {
                await db.prepare(statement).run();
            }
        }
        console.log('Migration 042 successful.');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

migrate();
