import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_y0K8hjWquDZc@ep-bold-truth-acq69xdo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function testEventosZen() {
    const { resolveQuestorUrl, getQuestorSynConfig } = await import('../src/app/actions/integrations/questor-syn');
    console.log("=== Testing EventosZen via TnWebDMConsulta ===");
    
    const config = await getQuestorSynConfig();
    const baseUrl = await resolveQuestorUrl(config!);
    const url = `${baseUrl}/TnWebDMConsulta/Pegar`;
    
    console.log("URL:", url);

    const params = new URLSearchParams();
    params.append('_AActionName', 'EventosZen');
    params.append('TokenApi', config!.api_token!);
    params.append('z.CodigoEmpresa', '1');
    params.append('CODIGOEMPRESA', '1');
    params.append('_AsEcho', 'JSON');
    params.append('_AiDisplayStart', '0');
    params.append('_AiDisplayLength', '100');
    
    const fullUrl = `${url}?${params.toString()}`;
    console.log("Full URL:", fullUrl.replace(/TokenApi=[^&]+/, 'TokenApi=***'));

    try {
        const res = await fetch(fullUrl, { method: 'GET' });
        const text = await res.text();
        console.log("Result:", text.substring(0, 1000));
    } catch(e) { console.error("Failed", e); }
    
    process.exit(0);
}

testEventosZen();