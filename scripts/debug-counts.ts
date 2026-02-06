import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import db from '../src/lib/db';

async function main() {
    console.log('--- Debugging Dashboard Counts ---');
    
    const now = new Date();
    const currMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    console.log(`Reference Date (Now): ${now.toISOString()}`);
    console.log(`Previous Month Start: ${prevMonthStart.toISOString()}`);
    console.log(`Current Month Start: ${currMonthStart.toISOString()}`);
    
    const tables = ['admission_requests', 'dismissals', 'vacations', 'transfer_requests'];
    
    let total = 0;
    
    console.log('\nCounts per table (Status = COMPLETED):');
    
    for (const table of tables) {
        try {
            const count = await db.prepare(`
              SELECT COUNT(*) FROM ${table} 
              WHERE status = 'COMPLETED' AND created_at >= ? AND created_at < ?
            `).pluck().get(prevMonthStart.toISOString(), currMonthStart.toISOString()) as number;
            
            console.log(`${table}: ${count}`);
            total += Number(count);
        } catch (e) {
            console.error(`Error querying ${table}:`, e);
        }
    }
    
    console.log(`\nTotal Calculated: ${total}`);
    
    console.log('\nTotal records in tables (All statuses):');
    for (const table of tables) {
        try {
            const count = await db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get() as number;
            console.log(`${table}: ${count}`);
        } catch (e) {
             console.error(`Error querying ${table}:`, e);
        }
    }
}

main().catch(console.error);
