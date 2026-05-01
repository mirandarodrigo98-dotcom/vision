import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function check() {
    const { default: db } = await import('../src/lib/db');
    const routines = await db.query('SELECT * FROM questor_syn_routines');
    console.log(routines.rows);
    process.exit(0);
}
check();