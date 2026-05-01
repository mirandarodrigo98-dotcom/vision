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

    console.log("Testing TnWebDMConsulta/Pegar for EmpresasVision...");

    const url = `${baseUrl}/TnWebDMConsulta/Pegar?_AActionName=EmpresasVision&TokenApi=${token}&_AsEcho=JSON&_AiDisplayLength=100&_AiDisplayStart=0&E.CODIGOEMPRESA=1`;
    
    try {
        const res = await fetch(url, { method: 'GET' });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(text.substring(0, 300));
    } catch(e) {}
    
    process.exit(0);
}
test();