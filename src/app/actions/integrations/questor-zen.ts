'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- Types ---
export interface QuestorZenConfig {
  id?: number;
  base_url: string;
  api_token: string | null;
  updated_at?: string;
}

// --- Schema ---
const questorZenConfigSchema = z.object({
  base_url: z.string().url('URL inválida'),
  api_token: z.string().optional(),
});

// --- Actions: Config ---

export async function getQuestorZenConfig() {
  const config = await db.prepare('SELECT * FROM questor_zen_config WHERE id = 1').get();
  return config as QuestorZenConfig | undefined;
}

export async function saveQuestorZenConfig(data: QuestorZenConfig) {
  // Validate
  const result = questorZenConfigSchema.safeParse({
    base_url: data.base_url,
    api_token: data.api_token
  });

  if (!result.success) {
      return { error: result.error.issues[0].message };
  }

  const existing = await getQuestorZenConfig();

  if (existing) {
    await db.prepare(
      `UPDATE questor_zen_config 
       SET base_url = ?, api_token = ?, updated_at = datetime('now')
       WHERE id = 1`
    ).run(data.base_url, data.api_token || null);
  } else {
    await db.prepare(
      `INSERT INTO questor_zen_config (id, base_url, api_token) 
       VALUES (1, ?, ?)`
    ).run(data.base_url, data.api_token || null);
  }
  revalidatePath('/admin/integrations/questor');
  return { success: true };
}

// --- Actions: API ---

export async function fetchQuestorZenCompany(identifier: string) {
    try {
        const config = await getQuestorZenConfig();
        if (!config || !config.base_url || !config.api_token) {
            return { error: 'Questor Zen não configurado (URL e Token obrigatórios).' };
        }

        // Clean URL
        const baseUrl = config.base_url.replace(/\/$/, '');
        
        // Try to determine if identifier is CNPJ or ID
        // Questor Zen usually searches by CNPJ in the path or query
        // Based on docs: GET {{url}}/api/v1/{{token}}/clientes/{CNPJ}
        
        // Remove symbols from CNPJ if present
        const cleanIdentifier = identifier.replace(/\D/g, '');
        
        let url = `${baseUrl}/api/v1/${config.api_token}/clientes/${cleanIdentifier}`;
        
        console.log(`[Questor Zen] Fetching: ${url.replace(config.api_token, '***')}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            if (response.status === 404) {
                return { error: 'Empresa não encontrada no Questor Zen.' };
            }
            if (response.status === 412) {
                const msgErro = response.headers.get('msgerro');
                // Check for specific error about Invalid Federal ID (CNPJ)
                // Encoding might be messed up (InscriÃ§Ã£o), so check for 'Federal' or generic 412
                if (msgErro && (msgErro.includes('Federal') || msgErro.includes('CNPJ'))) {
                    return { error: 'Questor Zen requer pesquisa por CNPJ válido. O código interno não é aceito neste campo.' };
                }
                return { error: `Erro de Validação (412): ${msgErro || 'Pré-condição falhou no servidor Questor. Verifique se o CNPJ está correto.'}` };
            }
            const text = await response.text();
            return { error: `Erro na requisição Zen: ${response.status} - ${text}` };
        }

        // Response might be empty body even with 200 OK according to some bad APIs, but docs say returns JSON
        const text = await response.text();
        if (!text) {
             return { error: 'Questor Zen retornou sucesso mas sem dados.' };
        }

        let data = JSON.parse(text);

        // Enrichment Strategy:
        // If address data is missing (common in some Questor configurations),
        // try to fetch from public APIs (ReceitaWS/BrasilAPI) to fill the gaps.
        // This ensures the user gets a complete form even if Zen API is partial.
        if (!data.Logadouro && !data.logradouro && cleanIdentifier.length === 14) {
            console.log('[Questor Zen] Address missing. Attempting enrichment via public API...');
            try {
                const publicData = await fetchPublicCompanyData(cleanIdentifier);
                if (publicData) {
                    console.log('[Questor Zen] Enrichment successful.');
                    // Merge public data into Zen data (using PascalCase to match Zen conventions)
                    data = {
                        ...data,
                        Logadouro: data.Logadouro || publicData.Logadouro,
                        Numero: data.Numero || publicData.Numero,
                        Complemento: data.Complemento || publicData.Complemento,
                        Bairro: data.Bairro || publicData.Bairro,
                        Cidade: data.Cidade || publicData.Cidade,
                        Estado: data.Estado || publicData.Estado,
                        Cep: data.Cep || publicData.Cep,
                        Telefone: data.Telefone || publicData.Telefone,
                        Email: data.Email || publicData.Email,
                        // Add a flag to indicate enrichment
                        _enriched: true
                    };
                }
            } catch (enrichError) {
                console.warn('[Questor Zen] Enrichment failed:', enrichError);
                // Continue with partial data
            }
        }

        return { data };

    } catch (error: any) {
        console.error('Error fetching Questor Zen data:', error);
        return { error: error.message || 'Erro desconhecido ao buscar dados no Zen' };
    }
}

// --- Helper: Public Data Enrichment ---

async function fetchPublicCompanyData(cnpj: string) {
    // Try ReceitaWS first (verified to work in this environment)
    try {
        const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`, {
            method: 'GET',
            cache: 'no-store'
        });
        
        if (response.ok) {
            const json = await response.json();
            if (json.status !== 'ERROR') {
                return {
                    Logadouro: json.logradouro,
                    Numero: json.numero,
                    Complemento: json.complemento,
                    Bairro: json.bairro,
                    Cidade: json.municipio,
                    Estado: json.uf,
                    Cep: json.cep ? json.cep.replace(/\D/g, '') : null,
                    Telefone: json.telefone,
                    Email: json.email
                };
            }
        }
    } catch (e) {
        console.error('ReceitaWS fetch failed:', e);
    }

    // Fallback to BrasilAPI (if needed in future, currently ReceitaWS is preferred)
    // ...

    return null;
}
