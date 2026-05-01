import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
}

async function run() {
    const { executeQuestorProcess } = await import('./src/app/actions/integrations/questor-syn');
    
    const actionsToTest = [
        'Eventos Zen',
        'EventoZen',
        'EventosZen',
        'Evento Zen'
    ];
    
    for (const action of actionsToTest) {
        console.log(`\nTesting action: '${action}'`);
        const res = await executeQuestorProcess(action, {
            'z.CodigoEmpresa': '21',
            'E.CODIGOEMPRESA': '21',
            'p.CodigoEmpresa': '21',
            'CODIGOEMPRESA': '21'
        });
        
        if (res.error) {
            console.log(`Failed: ${res.error}`);
        } else {
            console.log("SUCCESS!");
            console.log("Result:", JSON.stringify(res, null, 2).substring(0, 500));
        }
    }
    
    process.exit(0);
}
run();