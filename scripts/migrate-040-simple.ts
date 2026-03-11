import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

async function migrate() {
    console.log('Starting migration...');
    const sqlPath = path.join(process.cwd(), 'src/db/migrations/040_add_access_schedules_pg.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // db.prepare(sql) returns an object with .run()
    // .run() is async
    try {
        await db.prepare(sql).run();
        console.log('Migration successful.');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

migrate();
