import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
}

async function run() {
    const { executeQuestorProcess } = await import('./src/app/actions/integrations/questor-syn');
    const res = await executeQuestorProcess('Evento Zen', {'z.CodigoEmpresa': '1'});
    console.log("Result for Evento Zen:", res);
    process.exit(0);
}
run();