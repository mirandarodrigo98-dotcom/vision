import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function testCasing() {
    const { executeQuestorProcess } = await import('../src/app/actions/integrations/questor-syn');
    
    const names = [
        'EventosZen', 'Eventoszen', 'eventozen', 'EVENTOSZEN', 
        'EventoZen', 'eventoZen', 'eventoszen', 'Eventos Zen',
        'ConsultaEventosZen', 'Consulta_EventosZen', 'QEventosZen'
    ];

    for (const name of names) {
        console.log(`Testing ${name}...`);
        const res = await executeQuestorProcess(name, { 'z.CodigoEmpresa': '1' });
        if (res.error) {
            console.log(`  Failed: ${res.error}`);
        } else {
            console.log(`  SUCCESS! Data length: ${res.data?.length}`);
            break;
        }
    }
    process.exit(0);
}
testCasing();