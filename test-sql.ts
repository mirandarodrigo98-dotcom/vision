import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
}

async function run() {
    const { executeQuestorSQL } = await import('./src/app/actions/integrations/questor-syn');
    const res = await executeQuestorSQL('SELECT FIRST 10 CODIGOEMPRESA, CODIGOEVENTO, DESCREVENTO, REFEREVENTO, TIPOEVENTO FROM FPAEVENTO WHERE CODIGOEMPRESA = 21');
    console.log("Result:", JSON.stringify(res, null, 2));
    process.exit(0);
}
run();