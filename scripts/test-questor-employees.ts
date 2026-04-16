import { getQuestorSynConfig, resolveQuestorUrl } from '../src/app/actions/integrations/questor-syn';

async function main() {
    const config = await getQuestorSynConfig();
    const baseUrl = await resolveQuestorUrl(config);
    const token = config.api_token;
    const endpoint = `${baseUrl}/TnWebDMProcesso/ProcessoExecutar`;
    const params = new URLSearchParams();
    params.append('_AActionName', 'FuncionariosVision');
    params.append('TokenApi', token || '');
    params.append('_AsEcho', 'JSON');
    params.append('_AiDisplayLength', '9999');

    const res = await fetch(`${endpoint}?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "F.CODIGOEMPRESA": "20" })
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
}
main();