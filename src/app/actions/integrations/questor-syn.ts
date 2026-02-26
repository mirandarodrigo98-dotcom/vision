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
       SET base_url = ?, api_token = ?, updated_at = datetime('now')
       WHERE id = 1`
    ).run(data.base_url, data.api_token || null);
  } else {
    await db.prepare(
      `INSERT INTO questor_syn_config (id, base_url, api_token) 
       VALUES (1, ?, ?)`
    ).run(data.base_url, data.api_token || null);
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
  if (!config || !config.base_url) {
    return { error: 'Configuração do Questor SYN não encontrada' };
  }

  const baseUrl = config.base_url.replace(/\/$/, ''); // Remove trailing slash
  const url = new URL(`${baseUrl}/api/TnWebDMRelatorio/Executar`);
  
  // Add standard parameters
  url.searchParams.append('_AActionName', actionName);
  url.searchParams.append('_ABase64', 'False'); // We want raw content for CSV
  url.searchParams.append('_ATipoRetorno', returnType);
  
  if (config.api_token) {
    // Some docs say TokenApi, others say Authorization header.
    // The user's snippet says "TokenApi (Não obrigatório)".
    // We'll try adding it if present.
    url.searchParams.append('TokenApi', config.api_token);
  }

  // Add report specific parameters
  // Note: The docs say "Os parâmetros do Body devem ser ajustados de acordo com o relatório".
  // But for GET requests, they might be query params?
  // The example shows: http://.../Executar?_AActionName=...
  // And "Body da Requisição". This implies a POST request might be better if there are many params.
  // However, the endpoint is listed as GET.
  // If GET, we append to query string.
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': '*/*',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text();
      return { error: `Erro na requisição: ${response.status} - ${text}` };
    }

    if (returnType === 'nrwexCSV') {
      const text = await response.text();
      return { data: text };
    } else {
      // For PDF/HTML, we might want blob or base64
      // For now, let's assume we just need CSV for the data step.
      const buffer = await response.arrayBuffer();
      // Convert to base64 for safe transport to client
      const base64 = Buffer.from(buffer).toString('base64');
      return { data: base64, isBase64: true };
    }

  } catch (error) {
    console.error('Error executing report:', error);
    return { error: 'Erro ao conectar com o serviço Questor SYN' };
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
    if (!config?.base_url) return { error: 'Questor não configurado (Base URL)' };

    const token = await getQuestorSynTokenByModule('GERENCIADOR_EMPRESAS'); // Generic token or global
    // Actually, discovery usually doesn't strictly need a module token if Global is set.
    // Let's use getQuestorSynTokenByModule with a dummy or relevant key if needed, or just config.api_token
    // The previous implementation of getQuestorSynTokenByModule handles fallback.
    // Let's assume Discovery works with Global Token mainly, but we can try fetching.
    
    // Construct URL: /TnWebDMDadosObjetos/Pegar?_AActionName=...
    let url = `${config.base_url}/TnWebDMDadosObjetos/Pegar?_AActionName=${actionName}`;
    
    // Add Token if exists
    // Note: getQuestorSynTokenByModule handles fallback to global config.api_token
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

// --- Connectivity Test Action ---

export async function testQuestorConnectivity() {
  try {
    const config = await getQuestorSynConfig();
    if (!config?.base_url) return { error: 'Questor não configurado (Base URL)' };

    // Use Global Token
    const tokenToUse = config.api_token;

    // Use PegarVersaoQuestor as a lightweight ping
    let url = `${config.base_url}/TnWebDMDadosGerais/PegarVersaoQuestor`;
    
    if (tokenToUse) {
      url += `?TokenApi=${encodeURIComponent(tokenToUse)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) {
      const text = await response.text();
      return { error: `Falha na conexão: ${response.status} - ${text}` };
    }

    const data = await response.json();
    // Usually returns a version string or object
    return { success: true, version: data, usedToken: !!tokenToUse };

  } catch (error: any) {
    console.error('Error testing connectivity:', error);
    return { error: error.message || 'Erro desconhecido ao testar conexão' };
  }
}
