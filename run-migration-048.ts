import fs from 'fs';
import path from 'path';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

import db from './src/lib/db';

async function migrate() {
    console.log('Starting migration 048...');
    const sqlPath = path.join(process.cwd(), 'src/db/migrations/048_create_ir_module.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

        for (const statement of statements) {
            if (statement.trim()) {
                await db.query(statement, []);
            }
        }
        console.log('Migration 048 successful.');
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

migrate();
