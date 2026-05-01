import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';
}

async function test() {
    const { getQuestorSynConfig, resolveQuestorUrl } = await import('./src/app/actions/integrations/questor-syn');
    const config = await getQuestorSynConfig();
    const baseUrl = await resolveQuestorUrl(config);
    const token = config.api_token;

    const url = `${baseUrl}/TnFpaDMProcesso/ProcessoExecutar?_AActionName=PeriodoAquisitivo&TokenApi=${token}&_AsEcho=JSON&_AiDisplayLength=9999`;
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ "p.CodigoEmpresa": "1" }),
            headers: { 'Content-Type': 'application/json' }
        });
        const text = await res.text();
        console.log(`Status TnFpaDMProcesso for PeriodoAquisitivo: ${res.status}`);
        console.log(text.substring(0, 300));
    } catch(e) {}
    
    process.exit(0);
}
test();