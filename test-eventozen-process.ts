import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
}

async function test() {
    const { executeQuestorProcess } = await import('./src/app/actions/integrations/questor-syn');
    
    console.log("Testing executeQuestorProcess just like we did for EmpresasVision, SociosVision, PeriodoAquisitivo...");
    
    const actions = ['Eventos Zen', 'EventoZen', 'EventosZen'];
    const paramNames = ['z.CodigoEmpresa', 'E.CODIGOEMPRESA', 'p.CodigoEmpresa'];

    for (const action of actions) {
        for (const param of paramNames) {
            console.log(`\nTesting action '${action}' with param '${param}'`);
            const res = await executeQuestorProcess(action, { [param]: "21" });
            if (res.error) {
                console.log(`Error: ${res.error}`);
            } else if (res.data) {
                console.log(`SUCCESS! Returned ${res.data.length} rows.`);
            }
        }
    }
    
    process.exit(0);
}
test();