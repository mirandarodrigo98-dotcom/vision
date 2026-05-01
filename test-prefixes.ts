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

    const prefixes = ['Fpa', 'fpa', 'FPA', 'Web', 'Folha', ''];
    const names = ['Eventos Zen', 'EventoZen', 'EventosZen'];
    
    for (const p of prefixes) {
        for (const n of names) {
            const action = p + n;
            const url = `${baseUrl}/TnWebDMProcesso/ProcessoExecutar?_AActionName=${encodeURIComponent(action)}&TokenApi=${token}&_AsEcho=JSON&_AiDisplayLength=9999`;
            
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    body: JSON.stringify({ "z.CodigoEmpresa": "1", "CODIGOEMPRESA": "1" }),
                    headers: { 'Content-Type': 'application/json' }
                });
                const text = await res.text();
                if (!text.includes('não encontrado')) {
                    console.log(`\n[FOUND!] Action: '${action}'`);
                    console.log(`Status: ${res.status}`);
                    console.log(text.substring(0, 300));
                }
            } catch(e) {}
        }
    }
    
    process.exit(0);
}
test();