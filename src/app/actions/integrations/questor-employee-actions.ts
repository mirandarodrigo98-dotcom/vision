'use server';

import { getQuestorSynConfig, resolveQuestorUrl } from './questor-syn';

export async function fetchEmployeesFromQuestor(companyCode: string) {
    const config = await getQuestorSynConfig();
    if (!config) return { success: false, error: 'Questor não configurado.' };

    let baseUrl: string;
    try {
        baseUrl = await resolveQuestorUrl(config);
    } catch (e: any) {
        return { success: false, error: e.message };
    }
    
    const token = config.api_token;

    // Routine: FuncionariosVision (Custom Query)
    const routineName = 'FuncionariosVision';
    
    // Endpoint: TnWebDMProcesso/ProcessoExecutar (POST)
    // Auth and Action Name must be in URL
    const endpoint = `${baseUrl}/TnWebDMProcesso/ProcessoExecutar`;
    const params = new URLSearchParams();
    params.append('_AActionName', routineName);
    params.append('TokenApi', token || '');
    params.append('_AsEcho', 'JSON');
    params.append('_AiDisplayLength', '9999');

    const fullUrl = `${endpoint}?${params.toString()}`;

    console.log(`[Questor] Fetching employees from ${routineName} for company ${companyCode}`);

    try {
        // Body: { "F.CODIGOEMPRESA": "1" }
        // Critical: Value must be a string to avoid 500 error
        // Critical: Key must be "F.CODIGOEMPRESA" (case sensitive in some versions)
        const body = { 
            "F.CODIGOEMPRESA": String(companyCode)
        };

        const res = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            cache: 'no-store'
        });

        if (!res.ok) {
            const text = await res.text();
            console.error(`[Questor] Error fetching employees: ${res.status} - ${text}`);
            return { success: false, error: `Erro na comunicação com Questor: ${res.status}` };
        }

        const json = await res.json();

        // Check for business errors
        if (json.Error || json.Erro) {
            console.error(`[Questor] Business Error: ${json.Error || json.Erro}`);
            return { success: false, error: `Erro Questor: ${json.Error || json.Erro}` };
        }

        // Extract data from nested structure
        // Structure: Widgets.bottom[0].Itens[0].grids[0].items
        let items: any[] = [];
        try {
            const widgets = json.Widgets || {};
            const areas = [...(widgets.bottom || []), ...(widgets.client || [])];
            
            for (const area of areas) {
                if (area.Itens) {
                    for (const item of area.Itens) {
                        if (item.grids) {
                            for (const grid of item.grids) {
                                // Data can be in 'items', 'Items', 'data', 'Data'
                                const gridData = grid.items || grid.Items || grid.data || grid.Data;
                                if (Array.isArray(gridData)) {
                                    items = gridData;
                                    break;
                                }
                            }
                        }
                        if (items.length > 0) break;
                    }
                }
                if (items.length > 0) break;
            }
        } catch (e) {
            console.warn('[Questor] Error traversing response structure', e);
        }

        console.log(`[Questor] Found ${items.length} records`);

        // Helper to clean HTML entities
        const cleanStr = (str: any) => typeof str === 'string' ? str.replace(/&nbsp/g, ' ').trim() : str;

        // Map to internal format
        const employees = items.map((item: any) => ({
            code: item.CODIGOFUNCCONTR,
            name: cleanStr(item.NOMEFUNC),
            admission_date: item.DATAADM, // Note: Vision uses DATAADM, not DATAADMISSAO
            cpf: item.CPFFUNC,
            pis: item.PISFUNC,
            birth_date: item.DATANASC,
            esocial_registration: item.MATRICULAESOCIAL,
            status: 1, // 'FuncionariosVision' implies active/current view, or we can map if there's a status field
            sex: item.SEXO == 1 ? 'Masculino' : (item.SEXO == 2 ? 'Feminino' : 'Outro'),
            company_code: item.CODIGOEMPRESA
        }));

        return { success: true, data: employees };

    } catch (e: any) {
        console.error('[Questor] Network error:', e);
        return { success: false, error: `Erro de conexão: ${e.message}` };
    }
}
