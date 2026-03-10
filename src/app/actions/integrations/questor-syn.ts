'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { 
  QuestorSynConfig, 
  QuestorSynRoutine, 
  QuestorSynModuleToken,
  questorSynConfigSchema,
  questorSynRoutineSchema,
  questorSynModuleTokenSchema
} from '@/types/questor-syn';

// --- Helper: URL Resolution ---

export async function resolveQuestorUrl(config: QuestorSynConfig): Promise<string> {
  const urlsToCheck = [];
  
  if (config.internal_url) urlsToCheck.push({ url: config.internal_url, type: 'internal' });
  if (config.external_url) urlsToCheck.push({ url: config.external_url, type: 'external' });
  
  // Fallback to base_url if others are missing (legacy support)
  if (urlsToCheck.length === 0 && config.base_url) {
    urlsToCheck.push({ url: config.base_url, type: 'base' });
  }

  if (urlsToCheck.length === 0) {
    throw new Error('Nenhuma URL do Questor configurada.');
  }

  // Try Internal First (Short Timeout)
  for (const { url, type } of urlsToCheck) {
    try {
      const cleanUrl = url.replace(/\/$/, '');
      let testUrl = `${cleanUrl}/TnWebDMDadosGerais/PegarVersaoQuestor`;
      
      // Add Token if exists for auth check
      if (config.api_token) {
        testUrl += `?TokenApi=${encodeURIComponent(config.api_token)}`;
      }
      
      const controller = new AbortController();
      // Use shorter timeout for Internal to fail fast (4s)
      const timeoutId = setTimeout(() => controller.abort(), type === 'internal' ? 4000 : 10000);

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        console.log(`[Questor] Connected via ${type} URL: ${cleanUrl}`);
        return cleanUrl;
      }
    } catch (e) {
      console.warn(`[Questor] Failed to connect via ${type} URL (${url}):`, e);
      // Continue to next URL
    }
  }

  throw new Error('Não foi possível conectar ao Questor em nenhuma das URLs configuradas (Interna/Externa).');
}

// --- Actions: Config ---

export async function getQuestorSynConfig() {
  const config = await db.prepare('SELECT * FROM questor_syn_config WHERE id = 1').get();
  return config as QuestorSynConfig | undefined;
}

export async function saveQuestorSynConfig(data: QuestorSynConfig) {
  const existing = await getQuestorSynConfig();

  if (existing) {
    await db.prepare(
      `UPDATE questor_syn_config 
       SET base_url = ?, internal_url = ?, external_url = ?, api_token = ?, updated_at = datetime('now')
       WHERE id = 1`
    ).run(data.base_url || null, data.internal_url || null, data.external_url || null, data.api_token || null);
  } else {
    await db.prepare(
      `INSERT INTO questor_syn_config (id, base_url, internal_url, external_url, api_token) 
       VALUES (1, ?, ?, ?, ?)`
    ).run(data.base_url || null, data.internal_url || null, data.external_url || null, data.api_token || null);
  }
  revalidatePath('/admin/integrations/questor');
  return { success: true };
}

// --- Actions: Routines ---

export async function getQuestorSynRoutines() {
  return await db.prepare('SELECT * FROM questor_syn_routines ORDER BY name ASC').all() as QuestorSynRoutine[];
}

export async function saveQuestorSynRoutine(data: QuestorSynRoutine) {
  try {
    if (data.id) {
      await db.prepare(
        `UPDATE questor_syn_routines 
         SET name = ?, action_name = ?, type = ?, description = ?, parameters_schema = ?, layout_content = ?, system_code = ?, is_active = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(
        data.name,
        data.action_name,
        data.type,
        data.description || null,
        data.parameters_schema || null,
        data.layout_content || null,
        data.system_code || null,
        data.is_active,
        data.id
      );
    } else {
      const id = uuidv4();
      await db.prepare(
        `INSERT INTO questor_syn_routines (id, name, action_name, type, description, parameters_schema, layout_content, system_code, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        data.name,
        data.action_name,
        data.type,
        data.description || null,
        data.parameters_schema || null,
        data.layout_content || null,
        data.system_code || null,
        data.is_active
      );
    }
    revalidatePath('/admin/integrations/questor');
    return { success: true };
  } catch (error) {
    console.error('Error saving routine:', error);
    return { error: 'Erro ao salvar rotina' };
  }
}

// Re-export types for convenience in other server components/actions if needed, 
// BUT NOT for client components.
// Actually, it's safer to just import from '@/types/questor-syn' everywhere.

export async function deleteQuestorSynRoutine(id: string) {
  try {
    await db.prepare('DELETE FROM questor_syn_routines WHERE id = ?').run(id);
    revalidatePath('/admin/integrations/questor');
    return { success: true };
  } catch (error) {
    console.error('Error deleting routine:', error);
    return { error: 'Erro ao excluir rotina' };
  }
}

export async function executeQuestorReport(
  actionName: string,
  params: Record<string, string>,
  returnType: 'nrwexCSV' | 'nrwexPDF' | 'nrwexHTML' = 'nrwexCSV'
) {
  const config = await getQuestorSynConfig();
  if (!config) {
    return { error: 'Configuração do Questor SYN não encontrada' };
  }

  let baseUrl: string;
  try {
    baseUrl = await resolveQuestorUrl(config);
  } catch (e: any) {
    return { error: e.message };
  }

  const url = new URL(`${baseUrl}/TnWebDMRelatorio/Executar`);
  
  // Add standard parameters
  url.searchParams.append('_AActionName', actionName);
  url.searchParams.append('_ABase64', 'False'); // We want raw content for CSV
  url.searchParams.append('_ATipoRetorno', returnType);
  
  if (config.api_token) {
    url.searchParams.append('TokenApi', config.api_token);
  }

  // Add report specific parameters
  // Use POST with JSON body for report parameters to avoid URL length issues and ensure proper parsing
  
  console.log(`[Questor] Executing Report: ${actionName}`);
  console.log(`[Questor] URL (masked): ${url.toString().replace(/TokenApi=[^&]+/, 'TokenApi=***')}`);
  console.log(`[Questor] Body Params:`, JSON.stringify(params));

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Questor] Error ${response.status}: ${text}`);
      return { error: `Erro na requisição: ${response.status} - ${text}` };
    }

    if (returnType === 'nrwexCSV') {
      const text = await response.text();
      console.log(`[Questor] CSV Response Length: ${text.length}`);
      
      // Questor nWeb returns a JSON object with a "Data" field containing the CSV content
      // Example: {"PageCount":1, "Size":123, "Data": "CSV_CONTENT..."}
      try {
          const json = JSON.parse(text);
          if (json && json.Data) {
              console.log(`[Questor] Extracted CSV from JSON Data field (Length: ${json.Data.length})`);
              return { data: json.Data };
          }
      } catch (e) {
          // Not JSON, return raw text
          console.log('[Questor] Response is not JSON, returning raw text');
      }

      if (text.length < 100) console.log(`[Questor] CSV Preview: ${text}`); // Debug short responses
      return { data: text };
    } else {
      // For PDF/HTML, we might want blob or base64
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      console.log(`[Questor] Binary Response Size: ${buffer.byteLength}`);
      return { data: base64, isBase64: true };
    }

  } catch (error) {
    console.error('Error executing report:', error);
    return { error: 'Erro ao conectar com o serviço Questor SYN' };
  }
}

export async function executeQuestorSQL(
  sql: string,
  returnType: 'nrwexCSV' | 'nrwexXML' | 'nrwexJSON' = 'nrwexJSON'
) {
  const config = await getQuestorSynConfig();
  if (!config) {
    return { error: 'Configuração do Questor SYN não encontrada' };
  }

  let baseUrl: string;
  try {
    baseUrl = await resolveQuestorUrl(config);
  } catch (e: any) {
    return { error: e.message };
  }

  const url = new URL(`${baseUrl}/TnWebDMSql/Executar`);
  
  // Add standard parameters
  if (config.api_token) {
    url.searchParams.append('TokenApi', config.api_token);
  }

  console.log(`[Questor] Executing SQL at ${url.toString().replace(/TokenApi=[^&]+/, 'TokenApi=***')}: ${sql}`);

  try {
    // Using URLSearchParams for x-www-form-urlencoded body
    const params = new URLSearchParams();
    params.append('_ASQL', sql);
    params.append('_ABase64', 'False');
    params.append('_ATipoRetorno', returnType);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Questor] Error ${response.status}: ${text}`);
      return { error: `Erro na requisição: ${response.status} - ${text}` };
    }

    const text = await response.text();
    
    // Parse JSON response if requested
    if (returnType === 'nrwexJSON') {
        try {
            // Questor sometimes returns plain text even if JSON requested, or wrapped in "Data"
            const json = JSON.parse(text);
            if (json && json.Data && typeof json.Data === 'string') {
                // Sometimes Data is a stringified JSON/CSV
                try {
                    return { data: JSON.parse(json.Data) };
                } catch {
                    return { data: json.Data };
                }
            }
            return { data: json };
        } catch (e) {
            console.warn('[Questor] Failed to parse JSON response, returning text');
            return { data: text };
        }
    }

    return { data: text };

  } catch (error) {
    console.error('Error executing SQL:', error);
    return { error: 'Erro ao conectar com o serviço Questor SYN' };
  }
}

export async function executeQuestorProcess(
  routineName: string,
  filterParams: Record<string, string>
) {
  const config = await getQuestorSynConfig();
  if (!config) return { error: 'Questor não configurado.' };

  let baseUrl: string;
  try {
    baseUrl = await resolveQuestorUrl(config);
  } catch (e: any) {
    return { error: e.message };
  }

  const endpoint = `${baseUrl}/TnWebDMProcesso/ProcessoExecutar`;
  const urlParams = new URLSearchParams();
  urlParams.append('_AActionName', routineName);
  if (config.api_token) {
    urlParams.append('TokenApi', config.api_token);
  }
  urlParams.append('_AsEcho', 'JSON');
  urlParams.append('_AiDisplayLength', '9999');

  const fullUrl = `${endpoint}?${urlParams.toString()}`;

  console.log(`[Questor] Executing Process ${routineName} at ${fullUrl.replace(/TokenApi=[^&]+/, 'TokenApi=***')}`);

  try {
     const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filterParams),
        cache: 'no-store'
     });

     if (!response.ok) {
        const text = await response.text();
        console.error(`[Questor] Error ${response.status}: ${text}`);
        return { error: `Erro na requisição: ${response.status} - ${text}` };
     }

     const json = await response.json();
     if (json.Error || json.Erro) {
        console.error(`[Questor] Business Error: ${json.Error || json.Erro}`);
        return { error: `Erro Questor: ${json.Error || json.Erro}` };
     }

     // Parse items
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
     
     console.log(`[Questor] Process ${routineName} returned ${items.length} records`);
     return { data: items };

  } catch (e: any) {
     console.error('Error executing process:', e);
     return { error: e.message };
  }
}

// --- Helper for Execution (to be used by other modules) ---

export async function getQuestorSynRoutineBySystemCode(systemCode: string): Promise<QuestorSynRoutine | undefined> {
  try {
    const row = await db.prepare(
      'SELECT * FROM questor_syn_routines WHERE system_code = ?'
    ).get(systemCode);
    
    if (!row) return undefined;
    
    return {
      id: row.id,
      name: row.name,
      action_name: row.action_name,
      type: row.type as QuestorSynRoutine['type'],
      description: row.description,
      parameters_schema: row.parameters_schema,
      layout_content: row.layout_content,
      system_code: row.system_code,
      is_active: Boolean(row.is_active),
    };
  } catch (error) {
    console.error('Error fetching routine by system code:', error);
    return undefined;
  }
}

// --- Actions: Module Tokens (DEPRECATED - Using Global Token Only) ---

// Keeping empty implementations or stubs if needed to avoid breaking imports during refactor,
// but effectively disabling them.

export async function getQuestorSynModuleTokens() {
  return [];
}

export async function getQuestorSynTokenByModule(_moduleKey: string) {
  // Always fallback to Global Token
  const config = await getQuestorSynConfig();
  return config?.api_token;
}

export async function saveQuestorSynModuleToken(_data: QuestorSynModuleToken) {
  return { success: true };
}

export async function deleteQuestorSynModuleToken(_id: string) {
  return { success: true };
}

export async function getQuestorSynRoutineByAction(actionName: string): Promise<QuestorSynRoutine | undefined> {
  try {
    const row = await db.prepare(
      'SELECT * FROM questor_syn_routines WHERE action_name = ?'
    ).get(actionName);
    
    if (!row) return undefined;
    
    return {
      id: row.id,
      name: row.name,
      action_name: row.action_name,
      type: row.type as any,
      description: row.description,
      parameters_schema: row.parameters_schema,
      layout_content: row.layout_content,
      system_code: row.system_code,
      is_active: Boolean(row.is_active),
    };
  } catch (error) {
    console.error('Error fetching routine by action:', error);
    return undefined;
  }
}

// --- Discovery Action ---

export async function fetchQuestorRoutineParams(actionName: string) {
  try {
    const config = await getQuestorSynConfig();
    if (!config) return { error: 'Questor não configurado' };

    let baseUrl: string;
    try {
      baseUrl = await resolveQuestorUrl(config);
    } catch (e: any) {
      return { error: e.message };
    }

    const token = await getQuestorSynTokenByModule('GERENCIADOR_EMPRESAS'); // Generic token or global
    
    // Construct URL: /TnWebDMDadosObjetos/Pegar?_AActionName=...
    let url = `${baseUrl}/TnWebDMDadosObjetos/Pegar?_AActionName=${actionName}`;
    
    const tokenToUse = await getQuestorSynTokenByModule('GERENCIADOR_EMPRESAS') || config.api_token; 
    
    if (tokenToUse) {
      url += `&TokenApi=${encodeURIComponent(tokenToUse)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      const text = await response.text();
      return { error: `Erro na requisição: ${response.status} - ${text}` };
    }

    const data = await response.json();
    return { data };

  } catch (error: any) {
    console.error('Error fetching routine params:', error);
    return { error: error.message || 'Erro desconhecido ao buscar parâmetros' };
  }
}

export async function fetchQuestorData(
  actionName: string,
  params: Record<string, string>
) {
  try {
    const config = await getQuestorSynConfig();
    if (!config) return { error: 'Questor não configurado' };

    let baseUrl: string;
    try {
      baseUrl = await resolveQuestorUrl(config);
    } catch (e: any) {
      return { error: e.message };
    }

    const tokenToUse = config.api_token;

    // Construct URL: /TnWebDMDadosObjetos/Pegar?_AActionName=...
    const url = new URL(`${baseUrl}/TnWebDMDadosObjetos/Pegar`);
    url.searchParams.append('_AActionName', actionName);
    
    // Add Token if exists
    if (tokenToUse) {
      url.searchParams.append('TokenApi', tokenToUse);
    }

    // Add other params
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    console.log(`[Questor] Fetching Data: ${url.toString().replace(/TokenApi=[^&]+/, 'TokenApi=***')}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[Questor] Error ${response.status}: ${text}`);
      
      // Log headers for debugging
      const headers: Record<string, string> = {};
      response.headers.forEach((val, key) => headers[key] = val);
      console.log('[Questor] Error Headers:', headers);

      const user = response.headers.get('x-nweb-usuario') || response.headers.get('usuario') || 'N/A';

      return { 
        error: `Erro na requisição: ${response.status} - ${text} (Usuário: ${user})`,
        details: { status: response.status, body: text, headers }
      };
    }

    const data = await response.json();
    
    // Log success headers too, just in case
    const headers: Record<string, string> = {};
    response.headers.forEach((val, key) => headers[key] = val);
    console.log('[Questor] Success Headers:', headers);

    return { data };

  } catch (error: any) {
    console.error('Error fetching Questor data:', error);
    return { error: error.message || 'Erro desconhecido ao buscar dados' };
  }
}

// --- Connectivity Test Action ---

export async function testQuestorConnectivity() {
  try {
    const config = await getQuestorSynConfig();
    if (!config) return { error: 'Questor não configurado' };

    // Test both URLs individually to report status
    const results = {
      internal: { success: false, url: config.internal_url, message: '' },
      external: { success: false, url: config.external_url, message: '' },
      resolved: ''
    };

    if (config.internal_url) {
      try {
        let url = `${config.internal_url.replace(/\/$/, '')}/TnWebDMDadosGerais/PegarVersaoQuestor`;
        if (config.api_token) url += `?TokenApi=${encodeURIComponent(config.api_token)}`;
        
        const res = await fetch(url, { method: 'GET', cache: 'no-store' });
        if (res.ok) {
          results.internal.success = true;
          results.internal.message = 'OK';
        } else {
          results.internal.message = `Erro ${res.status}`;
        }
      } catch (e: any) {
        results.internal.message = e.message;
      }
    }

    if (config.external_url) {
      try {
        let url = `${config.external_url.replace(/\/$/, '')}/TnWebDMDadosGerais/PegarVersaoQuestor`;
        if (config.api_token) url += `?TokenApi=${encodeURIComponent(config.api_token)}`;

        const res = await fetch(url, { method: 'GET', cache: 'no-store' });
        if (res.ok) {
          results.external.success = true;
          results.external.message = 'OK';
        } else {
          results.external.message = `Erro ${res.status}`;
        }
      } catch (e: any) {
        results.external.message = e.message;
      }
    }

    // Determine resolved
    try {
      results.resolved = await resolveQuestorUrl(config);
    } catch {
      results.resolved = 'Nenhuma disponível';
    }

    return { 
      success: results.internal.success || results.external.success, 
      details: results,
      version: { internal: results.internal.message, external: results.external.message } 
    };

  } catch (error: any) {
    console.error('Error testing connectivity:', error);
    return { error: error.message || 'Erro desconhecido ao testar conexão' };
  }
}
