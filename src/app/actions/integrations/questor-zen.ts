'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export type QuestorZenConfig = {
  id: number;
  base_url: string;
  api_token: string;
  updated_at: Date;
};

const questorZenConfigSchema = z.object({
  base_url: z.string().url('O domínio do cliente deve ser uma URL válida').min(1, 'O domínio do cliente é obrigatório'),
  api_token: z.string().min(1, 'O token de acesso é obrigatório'),
});

export async function getQuestorZenConfig(): Promise<QuestorZenConfig | null> {
  const result = await db.query('SELECT * FROM questor_zen_config WHERE id = 1');
  return result.rows[0] || null;
}

export async function saveQuestorZenConfig(data: z.infer<typeof questorZenConfigSchema>) {
  try {
    const validatedData = questorZenConfigSchema.parse(data);

    // Format URL to ensure it doesn't end with a slash for easier usage later
    let domain = validatedData.base_url.trim();
    if (domain.endsWith('/')) {
      domain = domain.slice(0, -1);
    }

    const existing = await getQuestorZenConfig();
    
    if (existing) {
      await db.query(
        `UPDATE questor_zen_config SET base_url = $1, api_token = $2, updated_at = NOW() WHERE id = 1`, 
        [domain, validatedData.api_token.trim()]
      );
    } else {
      await db.query(
        `INSERT INTO questor_zen_config (id, base_url, api_token) VALUES (1, $1, $2)`, 
        [domain, validatedData.api_token.trim()]
      );
    }
    
    revalidatePath('/admin/integrations/questor');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Erro ao salvar configuração do Questor Zen' };
  }
}

// --- Funções de Integração com a API do Questor Zen ---

function buildUrl(config: QuestorZenConfig, path: string) {
  const base = config.base_url.replace(/\/$/, '');
  return `${base}/api/v1/${config.api_token}${path}`;
}

export async function uploadToZen(filename: string, content: string | Buffer): Promise<string | null> {
  try {
    const config = await getQuestorZenConfig();
    if (!config) throw new Error('Configuração do Questor Zen não encontrada');

    const url = buildUrl(config, `/upload/${encodeURIComponent(filename)}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: content
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Falha no upload (Status ${response.status}): ${errText}`);
    }

    const fileId = await response.json();
    return fileId;
  } catch (error: any) {
    console.error('[Questor Zen] Erro em uploadToZen:', error.message);
    return null;
  }
}

export async function getZenClientByCnpj(cnpj: string): Promise<string | null> {
  try {
    const config = await getQuestorZenConfig();
    if (!config) throw new Error('Configuração do Questor Zen não encontrada');

    const cleanCnpj = String(cnpj).replace(/\D/g, '');
    const url = buildUrl(config, `/clientes/${cleanCnpj}`);
    
    const response = await fetch(url, { 
      method: 'GET', 
      headers: { 'Content-Type': 'application/json' } 
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data?.CodigoCliente || null;
  } catch (error: any) {
    console.error('[Questor Zen] Erro em getZenClientByCnpj:', error.message);
    return null;
  }
}

export async function getZenCategories(): Promise<any[]> {
  try {
    const config = await getQuestorZenConfig();
    if (!config) throw new Error('Configuração do Questor Zen não encontrada');

    const url = buildUrl(config, `/categorias`);
    const response = await fetch(url, { 
      method: 'GET', 
      headers: { 'Content-Type': 'application/json' } 
    });

    if (!response.ok) return [];

    return await response.json();
  } catch (error: any) {
    console.error('[Questor Zen] Erro em getZenCategories:', error.message);
    return [];
  }
}

export async function findZenCategoryByNames(moduleName: string, categoryName: string): Promise<string | null> {
  const categories = await getZenCategories();
  for (const mod of categories) {
    if (mod.Descricao?.toLowerCase() === moduleName.toLowerCase() || !moduleName) {
      for (const cat of mod.Categorias || []) {
        if (cat.Descricao?.toLowerCase() === categoryName.toLowerCase()) {
          return cat.Codigo;
        }
      }
    }
  }
  return null;
}

export async function sendDocumentToZen(payload: {
  CodigoCategoria: string;
  CodigoCliente: string;
  CodigoArquivo: string;
  Titulo: string;
  Observacao?: string;
  DataCompetencia: string; // Formato YYYYMM
}): Promise<{ success: boolean; protocol?: string; error?: string }> {
  try {
    const config = await getQuestorZenConfig();
    if (!config) throw new Error('Configuração do Questor Zen não encontrada');

    const url = buildUrl(config, `/documentos`);
    
    const docPayload = {
      CodigoCategoria: payload.CodigoCategoria,
      CodigoCliente: payload.CodigoCliente,
      CodigoArquivo: payload.CodigoArquivo,
      Titulo: payload.Titulo,
      Observacao: payload.Observacao || '',
      Atributo: {
        DataCompetencia: payload.DataCompetencia
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Questor Zen] Erro em sendDocumentToZen:', response.status, errText);
      return { success: false, error: `Erro ${response.status}: ${errText}` };
    }

    const docText = await response.text();
    // A API retorna o ID do documento
    return { success: true, protocol: docText.replace(/"/g, '') };
  } catch (error: any) {
    console.error('[Questor Zen] Erro em sendDocumentToZen:', error.message);
    return { success: false, error: error.message };
  }
}
