'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

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

const accessRequestSchema = z.object({
  company_id: z.string(),
  external_company_cnpj: z.string().min(14),
  layout_code: z.number().default(0), // 0 might mean "All" or we need specific codes?
});

// --- Actions ---

export async function getQuestorConfig() {
  return await db.prepare('SELECT * FROM questor_config WHERE id = 1').get();
}

export async function saveQuestorConfig(data: z.infer<typeof questorConfigSchema>) {
  const existing = await getQuestorConfig();
  
  if (existing) {
    await db.prepare(
      `UPDATE questor_config 
       SET environment = ?, erp_cnpj = ?, default_accountant_cnpj = ?, access_token = COALESCE(?, access_token), updated_at = NOW() 
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

// --- API Interactions (Placeholder / Structure) ---

async function getBaseUrl() {
  const config = await getQuestorConfig();
  if (!config) throw new Error('Questor não configurado');
  return QUESTOR_API_URLS[config.environment as keyof typeof QUESTOR_API_URLS];
}

export async function requestAccess(companyId: string, companyCnpj: string) {
  try {
    const config = await getQuestorConfig();
    if (!config) return { error: 'Configuração do Questor ausente' };
    
    const baseUrl = await getBaseUrl();
    
    // Payload structure based on documentation analysis (Inferred)
    // Ref 2: "...CNPJ da empresa... CNPJ do Escritório Contábil..."
    const payload = {
      cnpjCliente: companyCnpj, // The company we want to manage
      cnpjContabilidade: config.default_accountant_cnpj, // The accountant who will approve
      cnpjErp: config.erp_cnpj, // Us (Vision)
      // Other fields might be required like Razao Social, etc.
    };

    // NOTE: This is a simulation/placeholder until we have the exact payload structure
    // from the full documentation or trial.
    // For now, we will save the intent in the DB.

    console.log('Sending Access Request to Questor:', payload);
    
    // Simulate API call
    // const response = await fetch(`${baseUrl}/api/v2/dadosescritorio/solicitaracesso`, { ... });
    // const data = await response.json();
    
    // Mock response
    const mockRequestId = `REQ-${Date.now()}`;
    
    // Upsert auth status
    const existing = await getQuestorCompanyStatus(companyId);
    if (existing) {
      await db.prepare(
        `UPDATE questor_company_auth 
         SET request_id = ?, status = 'pending', external_company_cnpj = ?, updated_at = NOW() 
         WHERE company_id = ?`
      ).run(mockRequestId, companyCnpj, companyId);
    } else {
      await db.prepare(
        `INSERT INTO questor_company_auth (id, company_id, request_id, status, external_company_cnpj) 
         VALUES (?, ?, ?, 'pending', ?)`
      ).run(crypto.randomUUID(), companyId, mockRequestId, companyCnpj);
    }

    revalidatePath('/admin/integrations/questor');
    return { success: true, requestId: mockRequestId, message: 'Solicitação enviada (Simulação)' };
  } catch (error) {
    console.error('Error requesting access:', error);
    return { error: 'Erro ao solicitar acesso' };
  }
}

export async function checkRequestStatus(companyId: string) {
  try {
    const auth = await getQuestorCompanyStatus(companyId);
    if (!auth || !auth.request_id) return { error: 'Solicitação não encontrada' };
    
    const config = await getQuestorConfig();
    const baseUrl = await getBaseUrl();

    // Call /api/v2/erp/gerartoken using the request_id?
    // Or check status endpoint?
    // Ref 2: "Após fazer o POST com esses dados [gerartoken], o ERP irá receber um código de acesso"
    
    // We try to generate token. If approved, we get it.
    
    console.log('Checking status/Generating token for:', auth.request_id);

    // Mock Success
    const mockToken = `TOKEN-${Date.now()}`;
    
    // If successful:
    await db.prepare(
      `UPDATE questor_config SET access_token = ? WHERE id = 1`
    ).run(mockToken);
    
    await db.prepare(
      `UPDATE questor_company_auth SET status = 'active', updated_at = NOW() WHERE company_id = ?`
    ).run(companyId);

    revalidatePath('/admin/integrations/questor');
    return { success: true, status: 'active' };

  } catch (error) {
    console.error('Error checking status:', error);
    return { error: 'Erro ao verificar status' };
  }
}

export async function syncTransactionsToQuestor(companyId: string, filters: any) {
  try {
    const config = await getQuestorConfig();
    if (!config || !config.access_token) {
      // Allow simulation if in dev or just return error
      // return { error: 'Token de acesso Questor não configurado.' };
      console.warn('Questor token missing. Proceeding in simulation mode if configured, or failing.');
      // For now, we block real sync but we can return validation errors.
      if (!config) return { error: 'Configuração do Questor ausente' };
    }

    // 1. Fetch Transactions with Integration Codes
    // We replicate the query from exportTransactionsCsv to ensure we have all data
    let query = `
      SELECT t.*, 
             c.description as category_name, c.code as category_code, c.integration_code as category_integration_code, 
             a.description as account_name, a.code as account_code, a.integration_code as account_integration_code
      FROM enuves_transactions t
      LEFT JOIN enuves_categories c ON t.category_id = c.id
      LEFT JOIN enuves_accounts a ON t.account_id = a.id
      WHERE t.company_id = ?
    `;
    const params: any[] = [companyId];

    // Apply filters (reuse logic if possible, or simplified)
    if (filters) {
        if (filters.startDate) {
            query += ` AND t.date >= ?`;
            params.push(filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate);
        }
        if (filters.endDate) {
            query += ` AND t.date <= ?`;
            params.push(filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate);
        }
        // Add other filters as needed
    }
    
    // Only sync pending? Or all matching filters?
    // Usually we want to sync those not yet synced or force resync.
    // For now, let's trust the filters.

    const transactions = await db.prepare(query).all(...params) as any[];

    if (transactions.length === 0) {
        return { error: 'Nenhum lançamento encontrado para os filtros selecionados.' };
    }

    // 2. Validate Integration Codes
    const errors: string[] = [];
    transactions.forEach(t => {
        const hasDebit = t.value > 0 ? (t.account_integration_code || t.account_code) : (t.category_integration_code || t.category_code);
        const hasCredit = t.value > 0 ? (t.category_integration_code || t.category_code) : (t.account_integration_code || t.account_code);
        
        if (!hasDebit || !hasCredit) {
            errors.push(`Lançamento de ${t.value} em ${t.date} sem códigos de integração (Conta/Categoria).`);
        }
    });

    if (errors.length > 0) {
        return { error: 'Existem lançamentos com problemas de cadastro (Falta código de integração).', details: errors.slice(0, 5) };
    }

    // 3. Generate Layout Content (Questor Standard CSV/TXT)
    // Layout: DATA;DÉBITO;CRÉDITO;HISTÓRICO;DESCRIÇÃO; VALOR
    const lines = transactions.map(t => {
      const date = new Date(t.date);
      const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      
      const value = parseFloat(t.value);
      const absValue = Math.abs(value);
      const formattedValue = absValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const categoryCode = t.category_integration_code || t.category_code || '';
      const accountCode = t.account_integration_code || t.account_code || '';

      let debit = '';
      let credit = '';

      if (value > 0) {
        debit = accountCode;
        credit = categoryCode;
      } else {
        debit = categoryCode;
        credit = accountCode;
      }

      const historicoCode = '1'; // Default history code
      let description = t.category_name === t.description ? t.category_name : `${t.category_name} ${t.description}`.trim();
      description = description.replace(/;/g, ' ').replace(/(\r\n|\n|\r)/gm, ' ').substring(0, 200);

      return `${formattedDate};${debit};${credit};${historicoCode};${description};${formattedValue}`;
    });

    const content = lines.join('\r\n');

    // 4. Send to Questor
    if (!config.access_token) {
         return { error: 'Token Questor não configurado. (Simulação: Arquivo gerado com sucesso)', preview: lines.slice(0, 3) };
    }

    const baseUrl = await getBaseUrl();
    const companyAuth = await getQuestorCompanyStatus(companyId);
    
    // We need the company CNPJ from client_companies table
    const company = await db.prepare('SELECT cnpj FROM client_companies WHERE id = ?').get(companyId) as { cnpj: string };
    if (!company) return { error: 'Empresa não encontrada.' };

    const payload = {
        cnpjCliente: company.cnpj, // Target company
        versao: "1.0",
        grupoLayout: 200, // Assuming 200 for Accounting/Contábil based on standard
        dataDocumentos: new Date().toISOString().split('T')[0],
        dado: content,
        cnpjContabilidade: [config.default_accountant_cnpj]
    };

    console.log('Sending to Questor /api/v2/dados/inserir...', { ...payload, dado: '...content...' });

    const response = await fetch(`${baseUrl}/api/v2/dados/inserir`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.access_token}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('Questor API Error:', errText);
        return { error: `Erro na API Questor: ${response.status} - ${errText}` };
    }

    // 5. Update Status
    const syncId = `SYNC-${Date.now()}`; // Or get from response if available
    const now = new Date().toISOString();
    
    // Bulk update status? Or just mark last sync?
    // We can update the questor_synced_at for these transaction IDs.
    // It's better to do this in a transaction.
    const ids = transactions.map(t => t.id);
    const placeholders = ids.map(() => '?').join(',');
    
    await db.prepare(`
        UPDATE enuves_transactions 
        SET questor_synced_at = ?, questor_sync_id = ? 
        WHERE id IN (${placeholders})
    `).run(now, syncId, ...ids);

    return { success: true, message: `${transactions.length} lançamentos enviados com sucesso.` };

  } catch (error: any) {
    console.error('Error syncing to Questor:', error);
    return { error: `Erro interno: ${error.message}` };
  }
}
