'use server';

import { getQuestorSynConfig } from './questor-syn';

function isPrivateQuestorUrl(rawUrl: string): boolean {
    try {
        const { hostname } = new URL(rawUrl);
        const normalizedHost = hostname.toLowerCase();

        if (normalizedHost === 'localhost') return true;
        if (normalizedHost === '0.0.0.0') return true;
        if (normalizedHost.startsWith('127.')) return true;
        if (normalizedHost.startsWith('10.')) return true;
        if (normalizedHost.startsWith('192.168.')) return true;

        if (normalizedHost.startsWith('172.')) {
            const secondOctet = Number(normalizedHost.split('.')[1]);
            if (secondOctet >= 16 && secondOctet <= 31) return true;
        }

        return false;
    } catch {
        return false;
    }
}

function getQuestorCandidateUrls(config: Awaited<ReturnType<typeof getQuestorSynConfig>>) {
    const urls = [];

    if (config?.internal_url) urls.push({ type: 'internal', url: config.internal_url });
    if (config?.external_url) urls.push({ type: 'external', url: config.external_url });
    if (urls.length === 0 && config?.base_url) urls.push({ type: 'base', url: config.base_url });

    if (process.env.VERCEL === '1' || Boolean(process.env.VERCEL_URL)) {
        urls.sort((a, b) => Number(isPrivateQuestorUrl(a.url)) - Number(isPrivateQuestorUrl(b.url)));
    }

    return urls;
}

export async function fetchEmployeesFromQuestor(companyCode: string) {
    const config = await getQuestorSynConfig();
    if (!config) return { success: false, error: 'Questor não configurado.' };
    
    const token = config.api_token;
    const candidateUrls = getQuestorCandidateUrls(config);
    const attemptErrors: string[] = [];

    if (candidateUrls.length === 0) {
        return { success: false, error: 'Nenhuma URL do Questor configurada.' };
    }

    // Routine: FuncionariosVision (Custom Query)
    const routineName = 'FuncionariosVision';

    console.log(`[Questor] Fetching employees from ${routineName} for company ${companyCode}`);
    
    for (const candidate of candidateUrls) {
        const baseUrl = candidate.url.replace(/\/$/, '');

        try {
            const endpoint = `${baseUrl}/TnWebDMProcesso/ProcessoExecutar`;
            const params = new URLSearchParams();
            params.append('_AActionName', routineName);
            params.append('TokenApi', token || '');
            params.append('_AsEcho', 'JSON');
            params.append('_AiDisplayLength', '9999');

            const fullUrl = `${endpoint}?${params.toString()}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), candidate.type === 'internal' ? 8000 : 20000);

            const body = {
                "F.CODIGOEMPRESA": String(companyCode)
            };

            const res = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body),
                cache: 'no-store',
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                const text = await res.text();
                console.error(`[Questor] Error fetching employees via ${candidate.type}: ${res.status} - ${text}`);
                attemptErrors.push(`${candidate.type}:${baseUrl}=>HTTP ${res.status}`);
                continue;
            }

            const json = await res.json();

            if (json.Error || json.Erro) {
                console.error(`[Questor] Business Error via ${candidate.type}: ${json.Error || json.Erro}`);
                attemptErrors.push(`${candidate.type}:${baseUrl}=>${json.Error || json.Erro}`);
                continue;
            }

            let items: any[] = [];
            try {
                const widgets = json.Widgets || {};
                const areas = [...(widgets.bottom || []), ...(widgets.client || [])];

                for (const area of areas) {
                    if (area.Itens) {
                        for (const item of area.Itens) {
                            if (item.grids) {
                                for (const grid of item.grids) {
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

            console.log(`[Questor] Found ${items.length} records via ${candidate.type}`);

            const cleanStr = (str: any) => typeof str === 'string' ? str.replace(/&nbsp/g, ' ').trim() : str;

            const employees = items.map((item: any) => {
                return {
                    code: item.CODIGOFUNCCONTR,
                    name: cleanStr(item.NOMEFUNC),
                    admission_date: item.DATAADM,
                    cpf: item.CPFFUNC,
                    pis: item.PISFUNC,
                    birth_date: item.DATANASC,
                    esocial_registration: item.MATRICULAESOCIAL,
                    status: 1,
                    sex: item.SEXO == 1 ? 'Masculino' : (item.SEXO == 2 ? 'Feminino' : 'Outro'),
                    company_code: item.CODIGOEMPRESA,
                    filial: item.CODIGOESTAB || item.FILIAL || '1'
                };
            });

            return { success: true, data: employees };
        } catch (e: any) {
            console.error(`[Questor] Network error via ${candidate.type}:`, e);
            attemptErrors.push(`${candidate.type}:${baseUrl}=>${e.message}`);
        }
    }

    return {
        success: false,
        error: `Nao foi possivel buscar funcionarios no Questor. Tentativas: ${attemptErrors.join(' | ')}`
    };
}
