const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function migrate() {
    try {
        await pool.query(`
            ALTER TABLE ir_declarations 
            ADD COLUMN IF NOT EXISTS send_whatsapp BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS send_email BOOLEAN DEFAULT FALSE;
        `);
        console.log('Columns added successfully.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}

migrate();