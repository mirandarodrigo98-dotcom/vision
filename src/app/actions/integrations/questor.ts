'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import iconv from 'iconv-lite';
import { getQuestorSynConfig, getQuestorSynRoutineBySystemCode, getQuestorSynTokenByModule } from './questor-syn';
import { QuestorSynRoutine } from '@/types/questor-syn';

const QUESTOR_API_URLS = {
  homologation: 'https://synhomologacao.questor.com.br',
  production: 'https://syn.questor.com.br',
};

// --- Schemas ---

const questorConfigSchema = z.object({
  environment: z.enum(['homologation', 'production']),
  erp_cnpj: z.string().min(14, 'CNPJ do ERP inválido'),
  default_accountant_cnpj: z.string().min(14, 'CNPJ do Contador inválido'),
  access_token: z.string().optional(),
});

// --- Actions ---

export async function getQuestorConfig() {
  return await db.prepare('SELECT * FROM questor_config WHERE id = 1').get();
}

export async function saveQuestorConfig(data: z.infer<typeof questorConfigSchema>) {
  // Validate data
  questorConfigSchema.parse(data);

  const existing = await getQuestorConfig();
  
  if (existing) {
    await db.prepare(
      `UPDATE questor_config 
       SET environment = ?, erp_cnpj = ?, default_accountant_cnpj = ?, access_token = COALESCE(?, access_token), updated_at = datetime('now') 
       WHERE id = 1`
    ).run(data.environment, data.erp_cnpj, data.default_accountant_cnpj, data.access_token || null);
  } else {
    await db.prepare(
      `INSERT INTO questor_config (id, environment, erp_cnpj, default_accountant_cnpj, access_token) 
       VALUES (1, ?, ?, ?, ?)`
    ).run(data.environment, data.erp_cnpj, data.default_accountant_cnpj, data.access_token || null);
  }
  revalidatePath('/admin/integrations/questor');
  return { success: true };
}

export async function getQuestorCompanyStatus(companyId: string) {
  return await db.prepare(
    'SELECT * FROM questor_company_auth WHERE company_id = ?'
  ).get(companyId);
}

// --- API Interactions ---

export async function getBaseUrl() {
  const config = await getQuestorConfig();
  if (!config) throw new Error('Questor não configurado');
  return QUESTOR_API_URLS[config.environment as keyof typeof QUESTOR_API_URLS];
}

export async function requestAccess(_companyId: string, _companyCnpj: string) {
    // Legacy implementation kept for reference or if user reverts
    return { error: 'Funcionalidade migrada para SYN Privado. Configure no painel.' };
}

export async function checkRequestStatus(_companyId: string) {
     // Legacy implementation kept for reference or if user reverts
     return { error: 'Funcionalidade migrada para SYN Privado. Configure no painel.' };
}

export async function checkQuestorSyncStatus(companyId: string, filters: any) {
  try {
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN questor_synced_at IS NOT NULL THEN 1 ELSE 0 END) as synced,
        SUM(CASE WHEN questor_synced_at IS NULL THEN 1 ELSE 0 END) as pending,
        MIN(date) as min_date,
        MAX(date) as max_date
      FROM enuves_transactions t
      WHERE t.company_id = ?
    `;
    const params: any[] = [companyId];

    if (filters) {
        if (filters.startDate) {
            query += ` AND t.date >= ?`;
            params.push(filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate);
        }
        if (filters.endDate) {
            query += ` AND t.date <= ?`;
            params.push(filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate);
        }
    }

    const result = await db.prepare(query).get(...params) as any;
    
    return {
      total: result.total || 0,
      synced: result.synced || 0,
      pending: result.pending || 0,
      minDate: result.min_date,
      maxDate: result.max_date,
      hasPriorSync: (result.synced || 0) > 0
    };
  } catch (error) {
    console.error('Error checking sync status:', error);
    return { error: 'Erro ao verificar status da sincronização' };
  }
}

export async function syncTransactionsToQuestor(companyId: string, filters: any) {
  try {
    // 1. Fetch Transactions (Common Logic)
    let query = `
      SELECT t.*, 
             c.description as category_name, c.code as category_code, c.integration_code as category_integration_code, 
             a.description as account_name, a.code as account_code, a.integration_code as account_integration_code,
             comp.code as company_code, comp.filial as company_filial
      FROM enuves_transactions t
      LEFT JOIN enuves_categories c ON t.category_id = c.id
      LEFT JOIN enuves_accounts a ON t.account_id = a.id
      LEFT JOIN client_companies comp ON t.company_id = comp.id
      WHERE t.company_id = ? AND t.questor_synced_at IS NULL
    `;
    const params: any[] = [companyId];

    if (filters) {
        if (filters.startDate) {
            query += ` AND t.date >= ?`;
            params.push(filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate);
        }
        if (filters.endDate) {
            query += ` AND t.date <= ?`;
            params.push(filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate);
        }
    }

    const transactions = await db.prepare(query).all(...params) as any[];

    if (transactions.length === 0) {
        return { error: 'Nenhum lançamento encontrado para os filtros selecionados.' };
    }

    // 2. Validate Integration Codes
    const errors: string[] = [];
    transactions.forEach((t: any) => {
        const hasDebit = t.value > 0 ? (t.account_integration_code || t.account_code) : (t.category_integration_code || t.category_code);
        const hasCredit = t.value > 0 ? (t.category_integration_code || t.category_code) : (t.account_integration_code || t.account_code);
        
        if (!hasDebit || !hasCredit) {
            errors.push(`Lançamento de ${t.value} em ${t.date} sem códigos de integração (Conta/Categoria).`);
        }
    });

    if (errors.length > 0) {
        return { error: 'Existem lançamentos com problemas de cadastro (Falta código de integração).', details: errors.slice(0, 5) };
    }

    // 3. Generate Content (Posicional CSV aligned with NLI Layout)
    // Layout Identified: [Empty];[Empresa];[Estab];[Data];[Debito];[Credito];[Complemento];[Valor]
    // Based on 'Coluna' property of NLI:
    // Col 2: Empresa
    // Col 3: Estab
    // Col 4: Data
    // Col 5: Debito
    // Col 6: Credito
    // Col 7: Complemento
    // Col 8: Valor
    
    const lines = transactions.map((t: any) => {
      const date = new Date(t.date);
      const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      
      const value = parseFloat(t.value);
      const absValue = Math.abs(value);
      const formattedValue = absValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const categoryCode = t.category_integration_code || t.category_code || '';
      const accountCode = t.account_integration_code || t.account_code || '';
      const companyCode = t.company_code || '';
      const branchCode = t.company_filial || '1';

      let debit = '';
      let credit = '';

      if (value > 0) {
        debit = accountCode;
        credit = categoryCode;
      } else {
        debit = categoryCode;
        credit = accountCode;
      }

      // Logic for Description/History field
      const categoryName = (t.category_name || '').trim();
      const transactionDescription = (t.description || '').trim();
      
      let description = '';
      
      if (!transactionDescription) {
          // 2) Se o histórico estiver em branco, leve o nome da categoria
          description = categoryName;
      } else if (categoryName.toLowerCase() === transactionDescription.toLowerCase()) {
          // 1) Se categoria = histórico, leva apenas o histórico (evita duplicação)
          description = transactionDescription;
      } else {
          // Mantém concatenação padrão: Categoria + Histórico
          description = `${categoryName} ${transactionDescription}`;
      }

      description = description.replace(/;/g, ' ').replace(/(\r\n|\n|\r)/gm, ' ').substring(0, 300);

      // Posicional CSV array
      const cols = [
        '',                // 1. VAZIO (Para pular Coluna 1)
        companyCode,       // 2. EMPRESA
        branchCode,        // 3. ESTAB
        formattedDate,     // 4. DATA
        debit,             // 5. DEBITO
        credit,            // 6. CREDITO
        description,       // 7. COMPL
        formattedValue     // 8. VALOR
      ];

      return cols.join(';');
    });

    const content = lines.join('\r\n');

    // 4. Try SYN Mode
    const synConfig = await getQuestorSynConfig();
    const synRoutine = await getQuestorSynRoutineBySystemCode('CONTABIL_IMPORT');

    // Use Global Token
    const tokenToUse = synConfig?.api_token;

    if (synConfig?.base_url && synRoutine) {
        if (!synRoutine.layout_content) {
            return { error: 'Rotina CONTABIL_IMPORT encontrada, mas sem conteúdo de Layout (NLI) cadastrado.' };
        }

        const layoutName = synRoutine.action_name.toLowerCase().endsWith('.nli') 
            ? synRoutine.action_name 
            : `${synRoutine.action_name}.nli`;

        const payload = {
            Leiautes: [
                {
                    Nome: layoutName, 
                    Arquivo: Buffer.from(synRoutine.layout_content).toString('base64')
                }
            ],
            // Convert content to Windows-1252 (ANSI) before Base64 encoding
            // Questor expects ANSI for accented characters to be displayed correctly
            Dados: iconv.encode(content, 'win1252').toString('base64'),
            PodeAlterarDados: true,
            ExecutarValidacaoFinal: "Sim"
        };

        // Construct URL
        let url = `${synConfig.base_url}/Integracao/Importar`;
        
        // Priority: Global Token
        if (tokenToUse) {
            url += `?TokenApi=${encodeURIComponent(tokenToUse)}`;
        }

        console.log('Sending to Questor SYN /Integracao/Importar...', { url: url.replace(tokenToUse || '', '***') });

        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
        } catch (fetchError: any) {
            console.error('Questor SYN Fetch Error:', fetchError);
            if (fetchError.cause?.code === 'ECONNREFUSED') {
                return { error: `Não foi possível conectar ao Questor SYN em ${synConfig.base_url}. Verifique se o serviço nWeb está rodando e acessível.` };
            }
            return { error: `Erro de conexão com Questor SYN: ${fetchError.message}` };
        }

        if (!response.ok) {
             const errText = await response.text();
             console.error('Questor SYN Error:', errText);
             return { error: `Erro na API Questor SYN: ${response.status} - ${errText}` };
        }
        
        // Success handling
        const syncId = `SYNC-SYN-${Date.now()}`;
        const now = new Date().toISOString();
        const ids = transactions.map((t: any) => t.id);
        const placeholders = ids.map(() => '?').join(',');
        
        await db.prepare(`
            UPDATE enuves_transactions 
            SET questor_synced_at = ?, questor_sync_id = ? 
            WHERE id IN (${placeholders})
        `).run(now, syncId, ...ids);

        return { success: true, message: `${transactions.length} lançamentos enviados com sucesso via SYN.` };
    }

    // 5. Fallback to Legacy (or Error if SYN preferred)
    // If SYN is not configured, we return error asking to configure it, 
    // as the user explicitly asked to implement "this" (SYN) for the project.
    
    if (!synConfig?.base_url) {
        return { error: 'Integração Questor SYN não configurada. Acesse Configurações > Integrações > Questor.' };
    }
    if (!synRoutine) {
        return { error: 'Rotina de Importação Contábil não encontrada. Cadastre uma rotina com Código do Sistema "CONTABIL_IMPORT" e o Layout NLI.' };
    }

    return { error: 'Erro desconhecido na integração.' };

  } catch (error: any) {
    console.error('Error syncing to Questor:', error);
    return { error: `Erro interno: ${error.message}` };
  }
}
