import { getQuestorSynConfig, resolveQuestorUrl } from '../src/app/actions/integrations/questor-syn';

async function main() {
    const config = await getQuestorSynConfig();
    const baseUrl = await resolveQuestorUrl(config);
    const token = config.api_token;
    
    // Testing endpoints to see if there's a different action name for employees that includes branches
    const url = `${baseUrl}/TnWebDMProcesso/ProcessoExecutar?_AActionName=FuncionariosVision&TokenApi=${token}&_AsEcho=JSON&_AiDisplayLength=100`;
    try {
        const body = { "F.CODIGOEMPRESA": "20" };
        const res = await fetch(url, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
        const data = await res.json();
        console.log(Object.keys(data.Widgets.bottom[0].Itens[0].grids[0].items[0]));
    } catch (e) {
        console.error(e);
    }
}
main();