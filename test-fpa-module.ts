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

    console.log("Testing Folha de Pagamento module endpoints for Eventos Zen...");

    const actions = ['Eventos Zen', 'EventoZen', 'EventosZen', 'Eventos_Zen'];
    const paramNames = ['z.CodigoEmpresa', 'CODIGOEMPRESA', 'E.CODIGOEMPRESA', 'p.CodigoEmpresa'];
    
    // As the user said, the difference is the module. Folha de Pagamento = TnFpaDM
    const endpoints = [
        'TnFpaDMProcesso/ProcessoExecutar',
        'TnFpaDMConsulta/ConsultaExecutar'
    ];

    for (const ep of endpoints) {
        for (const action of actions) {
            for (const param of paramNames) {
                const url = `${baseUrl}/${ep}?_AActionName=${encodeURIComponent(action)}&TokenApi=${token}&_AsEcho=JSON&_AiDisplayLength=9999`;
                const body = { [param]: "1" }; // Testing with company 1
                
                try {
                    const res = await fetch(url, {
                        method: 'POST',
                        body: JSON.stringify(body),
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const text = await res.text();
                    
                    // Only log if it's not a generic "not found" or "Action = nil" error
                    if (!text.includes('não encontrado') && !text.includes('Action = nil') && !text.includes('Bad Request')) {
                        console.log(`\n[SUCCESS?] Endpoint: ${ep} | Action: '${action}' | Param: '${param}'`);
                        console.log(`Status: ${res.status}`);
                        console.log(text.substring(0, 300));
                    }
                } catch(e) {}
            }
        }
    }
    
    process.exit(0);
}
test();