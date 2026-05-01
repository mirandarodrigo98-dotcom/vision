import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function deleteVT() {
    const { default: db } = await import('../src/lib/db');
    console.log("Deleting VT records...");
    await db.query('DELETE FROM transport_voucher_employees');
    await db.query('DELETE FROM transport_vouchers');
    console.log("Done.");
    process.exit(0);
}
deleteVT();