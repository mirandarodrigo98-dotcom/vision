const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function migrate() {
    console.log('Starting migration 048...');
    const sqlPath = path.join(__dirname, 'src/db/migrations/048_create_ir_module.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        await pool.query(sql);
        console.log('Migration 048 successful.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await pool.end();
    }
}

migrate();