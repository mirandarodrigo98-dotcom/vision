import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
}
import Papa from 'papaparse';

async function test() {
    const { executeQuestorReport } = await import('./src/app/actions/integrations/questor-syn');
    const analiseParams = {
        pCodigoEmpresa: '65',
        pCompetInicial: '05/2025', 
        pCompetFinal: '04/2026', 
        pRegimeSSimples: '3',
    };
    console.log("Running report nFisRRAnaliseSuperSimples with minimal params...");
    const resultAnalise = await executeQuestorReport('nFisRRAnaliseSuperSimples', analiseParams, 'nrwexCSV');
    console.log(resultAnalise.data);
    process.exit(0);
}
test();