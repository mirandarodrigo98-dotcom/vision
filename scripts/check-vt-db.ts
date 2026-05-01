import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { Pool } from 'pg';

async function check() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL?.replace('?sslmode=require', ''),
        ssl: { rejectUnauthorized: false }
    });
    try {
        const res = await pool.query('SELECT * FROM transport_vouchers ORDER BY created_at DESC LIMIT 5');
        console.log("VTs in DB:", res.rows);
        
        const res2 = await pool.query('SELECT * FROM transport_voucher_employees LIMIT 5');
        console.log("Employees in DB:", res2.rows);
    } catch(err) {
        console.error("DB Query error:", err);
    } finally {
        await pool.end();
    }
}
check();