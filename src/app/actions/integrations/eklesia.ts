'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import parsePDF from '@/lib/pdf-parser';

const categorySchema = z.object({
  description: z.string().max(50, 'A descrição deve ter no máximo 50 caracteres'),
  integration_code: z.string().max(20, 'O código de integração deve ter no máximo 20 caracteres').optional(),
  nature: z.enum(['Saída', 'Entrada', 'Transferência'], { error: 'Natureza inválida' }),
});

const updateCategorySchema = z.object({
  id: z.string(),
  description: z.string().max(50, 'A descrição deve ter no máximo 50 caracteres'),
  integration_code: z.string().max(20, 'O código de integração deve ter no máximo 20 caracteres').optional(),
});

export type Category = {
  id: string;
  company_id: string;
  code: string;
  description: string;
  integration_code?: string;
  nature: 'Saída' | 'Entrada' | 'Transferência';
  is_active: boolean;
  created_at: string;
};

export async function getCategories(
  companyId: string,
  filters?: {
    code?: string;
    description?: string;
    integration_code?: string;
    nature?: string;
  }
) {
  const session = await getSession();
  if (!session) return [];

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return [];

  try {
    let query = `
      SELECT * FROM eklesia_categories 
      WHERE company_id = ?
    `;
    const params: any[] = [targetCompanyId];

    if (filters) {
      if (filters.code) {
        query += ` AND code LIKE ?`;
        params.push(`%${filters.code}%`);
      }
      if (filters.description) {
        query += ` AND description LIKE ?`;
        params.push(`%${filters.description}%`);
      }
      if (filters.integration_code) {
        query += ` AND integration_code LIKE ?`;
        params.push(`%${filters.integration_code}%`);
      }
      if (filters.nature && filters.nature !== 'all') {
        query += ` AND nature = ?`;
        params.push(filters.nature);
      }
    }

    query += ` ORDER BY code ASC`;

    const categories = await db.prepare(query).all(...params) as any[];

    return categories.map(cat => ({
      ...cat,
      is_active: Boolean(cat.is_active),
      created_at: cat.created_at ? new Date(cat.created_at).toISOString() : null
    })) as Category[];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}


export async function getNextCode(nature: 'Saída' | 'Entrada' | 'Transferência', companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  try {
    let minCode = 0;
    let maxCode = 0;

    if (nature === 'Entrada') {
      minCode = 800000;
      maxCode = 899999;
    } else if (nature === 'Saída') {
      minCode = 900000;
      maxCode = 999999;
    } else {
      minCode = 700000;
      maxCode = 799999;
    }

    const result = await db.prepare(`
      SELECT MAX(CAST(code AS INTEGER)) as max_code 
      FROM eklesia_categories 
      WHERE company_id = ? AND CAST(code AS INTEGER) >= ? AND CAST(code AS INTEGER) <= ?
    `).get(targetCompanyId, minCode, maxCode) as { max_code: number | null };

    let nextCode = minCode;
    if (result && result.max_code) {
      nextCode = result.max_code + 1;
    }

    if (nextCode > maxCode) {
      return { error: 'Limite atingido' };
    }

    return { nextCode: String(nextCode) };
  } catch (error) {
    console.error('Error fetching next code:', error);
    return { error: 'Erro ao obter próximo código' };
  }
}

export async function createCategory(data: z.infer<typeof categorySchema>, companyId: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Não autorizado' };
  }

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  const validation = categorySchema.safeParse(data);
  if (!validation.success) {
    const message = validation.error.issues[0]?.message || 'Dados inválidos';
    return { error: message };
  }

  try {
    // Generate automatic code based on nature
    let minCode = 0;
    let maxCode = 0;

    if (data.nature === 'Entrada') {
      minCode = 800000;
      maxCode = 899999;
    } else if (data.nature === 'Saída') {
      minCode = 900000;
      maxCode = 999999;
    } else {
      // Transferência or fallback
      minCode = 700000;
      maxCode = 799999;
    }

    const result = await db.prepare(`
      SELECT MAX(CAST(code AS INTEGER)) as max_code 
      FROM eklesia_categories 
      WHERE company_id = ? AND CAST(code AS INTEGER) >= ? AND CAST(code AS INTEGER) <= ?
    `).get(targetCompanyId, minCode, maxCode) as { max_code: number | null };

    let nextCode = minCode;
    if (result && result.max_code) {
      nextCode = result.max_code + 1;
    }

    if (nextCode > maxCode) {
      return { error: `Limite de códigos atingido para a natureza ${data.nature}.` };
    }

    const generatedCode = String(nextCode);

    const id = uuidv4();
    await db.prepare(`
      INSERT INTO eklesia_categories (id, company_id, code, description, integration_code, nature)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      targetCompanyId,
      generatedCode,
      data.description,
      data.integration_code || null,
      data.nature
    );

    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed') || error.message.includes('duplicate key value violates unique constraint') || error.code === '23505') {
      return { error: 'Já existe uma categoria com este código.' };
    }
    console.error('Error creating category:', error);
    return { error: 'Erro ao criar categoria' };
  }
}

export async function updateCategory(data: z.infer<typeof updateCategorySchema>, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  const validation = updateCategorySchema.safeParse(data);
  if (!validation.success) {
    const message = validation.error.issues[0]?.message || 'Dados inválidos';
    return { error: message };
  }

  try {
    await db.prepare(`
      UPDATE eklesia_categories 
      SET description = ?, integration_code = ?
      WHERE id = ? AND company_id = ?
    `).run(
      data.description,
      data.integration_code || null,
      data.id,
      targetCompanyId
    );

    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error) {
    console.error('Error updating category:', error);
    return { error: 'Erro ao atualizar categoria' };
  }
}

export async function deleteCategory(id: string, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  try {
    await db.prepare('DELETE FROM eklesia_categories WHERE id = ? AND company_id = ?').run(id, targetCompanyId);
    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { error: 'Erro ao excluir categoria' };
  }
}

export async function toggleCategoryStatus(id: string, isActive: boolean, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  try {
    await db.prepare(`
      UPDATE eklesia_categories 
      SET is_active = ? 
      WHERE id = ? AND company_id = ?
    `).run(isActive ? 1 : 0, id, targetCompanyId);

    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error) {
    console.error('Error toggling category status:', error);
    return { error: 'Erro ao alterar status da categoria' };
  }
}

const SAIDA_CATEGORIES = [
  "ABSF", "Alarme", "App Enuvens", "Benificiência", "Brindes", "Cartão de crédito", "Contabilidade", "DARF",
  "ENERGIA ELETRICA", "Equipamentos Eletrônicos", "INSS Contribuição aposentadoria pastoral", "Instrumentos Musicais",
  "Internet", "IRPF Imposto de renda", "IRRF Imposto de renda da poupança", "Lanches", "Light", "Manutenção e Conservação",
  "Ministério da Fazenda Darf", "Ministério de Ensino", "Ministério de Eventos Festas no Geral", "Ministerio Familia",
  "Missões Mundiais", "Missões Nacionais", "Plano Cooperativo", "SAAE", "Secretaria IBVM", "Serviços Bancarios",
  "Serviços Ceia", "SERVIÇOS ESSENCIAS", "Serviços Estaduais", "Supermercado", "Sustento Ministro de Música",
  "Sustento Pastoral", "Tarifa Bancaria Extratos", "Tarifas cobradas pelo banco", "Xerox",
  "Acerto de Caixa", "Beneficência", "Ajuda para famílias da igreja ou pessoas necessitadas", "Cantina", "Construção",
  "Ofertas para Reformas e construção da igreja", "Deposito Avulso", "Dízimo", "Juros", "Oferta Missionária",
  "Ofertas Alçadas", "Reembolso de despesas"
];

const ENTRADA_CATEGORIES: string[] = [
  // User didn't specify distinct list for Entrada in recent messages, but asked to separate.
  // Using generic or previously identified ones if any.
  // For now, keeping the old DEFAULT_CATEGORIES logic but separated.
];

export async function seedDefaultCategories(companyId: string, nature: 'Entrada' | 'Saída' = 'Entrada') {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  try {
    const listToUse = nature === 'Saída' ? SAIDA_CATEGORIES : ENTRADA_CATEGORIES;
    if (listToUse.length === 0) {
        // Fallback or empty
        return { success: true, message: 'Lista vazia' };
    }

    const minCode = nature === 'Entrada' ? 800000 : 900000;
    
    // Check existing
    const existing = await db.prepare('SELECT description FROM eklesia_categories WHERE company_id = ?').all(targetCompanyId) as { description: string }[];
    const existingSet = new Set(existing.map(e => e.description));

    let count = 0;
    
    // Need to find the next available code
    // Optimization: fetch max code once
    const result = await db.prepare(`
        SELECT MAX(CAST(code AS INTEGER)) as max_code 
        FROM eklesia_categories 
        WHERE company_id = ? AND CAST(code AS INTEGER) >= ? AND CAST(code AS INTEGER) <= ?
    `).get(targetCompanyId, minCode, minCode + 99999) as { max_code: number | null };

    let nextCode = (result && result.max_code) ? result.max_code + 1 : minCode;

    for (const desc of listToUse) {
      if (!existingSet.has(desc)) {
        const id = uuidv4();
        await db.prepare(`
          INSERT INTO eklesia_categories (id, company_id, code, description, nature)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, targetCompanyId, String(nextCode), desc, nature);
        nextCode++;
        count++;
      }
    }

    revalidatePath('/admin/integrations/eklesia');
    return { success: true, count };
  } catch (error) {
    console.error('Error seeding categories:', error);
    return { error: 'Erro ao inserir padrões' };
  }
}

export type Transaction = {
  id: string;
  company_id: string;
  category_id: string;
  category_name?: string;
  category_code?: string;
  account_id?: string | null;
  account_name?: string;
  date: string;
  description: string;
  original_description?: string;
  value: number;
  created_at: string;
};

export async function getTransactions(
  companyId: string, 
  filters?: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    accountId?: string;
    description?: string;
    minValue?: number;
    maxValue?: number;
  }
) {
  const session = await getSession();
  if (!session) return [];

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return [];

  try {
    let query = `
      SELECT t.*, c.description as category_name, c.code as category_code, a.description as account_name
      FROM eklesia_transactions t
      LEFT JOIN eklesia_categories c ON t.category_id = c.id
      LEFT JOIN eklesia_accounts a ON t.account_id = a.id
      WHERE t.company_id = ?
    `;

    const params: any[] = [targetCompanyId];

    if (filters) {
      if (filters.startDate) {
        query += ` AND t.date >= ?`;
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        query += ` AND t.date <= ?`;
        params.push(filters.endDate);
      }
      if (filters.categoryId && filters.categoryId !== 'all') {
        query += ` AND t.category_id = ?`;
        params.push(filters.categoryId);
      }
      if (filters.accountId && filters.accountId !== 'all') {
        query += ` AND t.account_id = ?`;
        params.push(filters.accountId);
      }
      if (filters.description) {
        query += ` AND t.description LIKE ?`;
        params.push(`%${filters.description}%`);
      }
      if (filters.minValue !== undefined && filters.minValue !== null) {
        query += ` AND t.value >= ?`;
        params.push(filters.minValue);
      }
      if (filters.maxValue !== undefined && filters.maxValue !== null) {
        query += ` AND t.value <= ?`;
        params.push(filters.maxValue);
      }
    }

    query += ` ORDER BY t.date DESC`;

    const transactions = await db.prepare(query).all(...params) as Transaction[];
    
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

const updateTransactionSchema = z.object({
  id: z.string(),
  date: z.string(),
  categoryId: z.string(),
  accountId: z.string().nullable().optional(),
  description: z.string(),
  value: z.number(),
});

export async function updateTransaction(data: z.infer<typeof updateTransactionSchema>, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  const validation = updateTransactionSchema.safeParse(data);
  if (!validation.success) {
    const message = validation.error.issues[0]?.message || 'Dados inválidos';
    return { error: message };
  }

  try {
    await db.prepare(`
      UPDATE eklesia_transactions
      SET date = ?, category_id = ?, account_id = ?, description = ?, value = ?
      WHERE id = ? AND company_id = ?
    `).run(
      data.date,
      data.categoryId,
      data.accountId || null,
      data.description,
      data.value,
      data.id,
      targetCompanyId
    );

    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error) {
    console.error('Error updating transaction:', error);
    return { error: 'Erro ao atualizar lançamento' };
  }
}

export async function deleteTransaction(id: string, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  try {
    await db.prepare('DELETE FROM eklesia_transactions WHERE id = ? AND company_id = ?').run(id, targetCompanyId);
    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return { error: 'Erro ao excluir lançamento' };
  }
}

export async function deleteTransactionsBatch(ids: string[], companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  if (!ids || ids.length === 0) return { error: 'Nenhum lançamento selecionado' };

  try {
    // SQLite/Postgres 'IN' clause parameter generation
    const placeholders = ids.map(() => '?').join(',');
    const query = `DELETE FROM eklesia_transactions WHERE id IN (${placeholders}) AND company_id = ?`;
    
    await db.prepare(query).run(...ids, targetCompanyId);
    
    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error) {
    console.error('Error deleting transactions batch:', error);
    return { error: 'Erro ao excluir lançamentos em lote' };
  }
}

// Accounts Management

const accountSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').max(100, 'A descrição deve ter no máximo 100 caracteres'),
  integration_code: z.string().max(20, 'O código de integração deve ter no máximo 20 caracteres').optional(),
});

const updateAccountSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Descrição é obrigatória').max(100, 'A descrição deve ter no máximo 100 caracteres'),
  integration_code: z.string().max(20, 'O código de integração deve ter no máximo 20 caracteres').optional(),
});

export type Account = {
  id: string;
  company_id: string;
  code: string;
  description: string;
  integration_code?: string;
  is_active: boolean;
  created_at: string;
};

export async function getAccounts(
  companyId: string,
  filters?: {
    code?: string;
    description?: string;
    integration_code?: string;
  }
) {
  const session = await getSession();
  if (!session) return [];

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return [];

  try {
    let query = `
      SELECT * FROM eklesia_accounts 
      WHERE company_id = ?
    `;
    const params: any[] = [targetCompanyId];

    if (filters) {
      if (filters.code) {
        query += ` AND code LIKE ?`;
        params.push(`%${filters.code}%`);
      }
      if (filters.description) {
        query += ` AND description LIKE ?`;
        params.push(`%${filters.description}%`);
      }
      if (filters.integration_code) {
        query += ` AND integration_code LIKE ?`;
        params.push(`%${filters.integration_code}%`);
      }
    }

    query += ` ORDER BY CAST(code AS INTEGER) ASC`;

    const accounts = await db.prepare(query).all(...params) as any[];
    
    return accounts.map(account => ({
      ...account,
      is_active: Boolean(account.is_active),
      created_at: account.created_at ? new Date(account.created_at).toISOString() : null
    })) as Account[];
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
}

export async function getNextAccountCode(companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  try {
    const result = await db.prepare(`
      SELECT MAX(CAST(code AS INTEGER)) as max_code 
      FROM eklesia_accounts 
      WHERE company_id = ?
    `).get(targetCompanyId) as { max_code: number | null };

    let nextCode = 1;
    if (result && result.max_code) {
      nextCode = result.max_code + 1;
    }

    return { nextCode: String(nextCode) };
  } catch (error) {
    console.error('Error fetching next account code:', error);
    return { error: 'Erro ao obter próximo código' };
  }
}

export async function createAccount(data: z.infer<typeof accountSchema>, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  const validation = accountSchema.safeParse(data);
  if (!validation.success) {
    const message = validation.error.issues[0]?.message || 'Dados inválidos';
    return { error: message };
  }

  try {
    // Generate automatic code
    const codeResult = await getNextAccountCode(targetCompanyId);
    if (codeResult.error || !codeResult.nextCode) {
        return { error: codeResult.error || 'Erro ao gerar código' };
    }

    const id = uuidv4();
    await db.prepare(`
      INSERT INTO eklesia_accounts (id, company_id, code, description, integration_code)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      targetCompanyId,
      codeResult.nextCode,
      data.description,
      data.integration_code || null
    );

    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error: any) {
    if (error.message && (error.message.includes('UNIQUE constraint failed') || error.message.includes('duplicate key'))) {
        // Retry logic could be here, but for now just fail
       return { error: 'Erro de concorrência ao gerar código. Tente novamente.' };
    }
    console.error('Error creating account:', error);
    return { error: 'Erro ao criar conta' };
  }
}

export async function updateAccount(data: z.infer<typeof updateAccountSchema>, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  const validation = updateAccountSchema.safeParse(data);
  if (!validation.success) {
    const message = validation.error.issues[0]?.message || 'Dados inválidos';
    return { error: message };
  }

  try {
    await db.prepare(`
      UPDATE eklesia_accounts 
      SET description = ?, integration_code = ?
      WHERE id = ? AND company_id = ?
    `).run(
      data.description,
      data.integration_code || null,
      data.id,
      targetCompanyId
    );

    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error) {
    console.error('Error updating account:', error);
    return { error: 'Erro ao atualizar conta' };
  }
}

export async function toggleAccountStatus(id: string, isActive: boolean, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  try {
    await db.prepare(`
      UPDATE eklesia_accounts 
      SET is_active = ? 
      WHERE id = ? AND company_id = ?
    `).run(isActive ? 1 : 0, id, targetCompanyId);

    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error) {
    console.error('Error toggling account status:', error);
    return { error: 'Erro ao alterar status da conta' };
  }
}

export async function deleteAccount(id: string, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  try {
    await db.prepare('DELETE FROM eklesia_accounts WHERE id = ? AND company_id = ?').run(id, targetCompanyId);
    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error) {
    console.error('Error deleting account:', error);
    return { error: 'Erro ao excluir conta' };
  }
}

export async function exportTransactionsCsv(companyId: string, filters?: any) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  try {
    // 1. Fetch transactions with filters (reusing query logic)
    let query = `
      SELECT t.*, c.description as category_name, c.code as category_code, c.integration_code as category_integration_code, 
             a.description as account_name, a.code as account_code, a.integration_code as account_integration_code
      FROM eklesia_transactions t
      LEFT JOIN eklesia_categories c ON t.category_id = c.id
      LEFT JOIN eklesia_accounts a ON t.account_id = a.id
      WHERE t.company_id = ?
    `;
    const params: any[] = [targetCompanyId];

    if (filters) {
      if (filters.startDate) {
        query += ` AND t.date >= ?`;
        params.push(filters.startDate instanceof Date ? filters.startDate.toISOString() : filters.startDate);
      }
      if (filters.endDate) {
        query += ` AND t.date <= ?`;
        params.push(filters.endDate instanceof Date ? filters.endDate.toISOString() : filters.endDate);
      }
      if (filters.categoryId && filters.categoryId !== 'all') {
        query += ` AND t.category_id = ?`;
        params.push(filters.categoryId);
      }
      if (filters.accountId && filters.accountId !== 'all') {
        query += ` AND t.account_id = ?`;
        params.push(filters.accountId);
      }
      if (filters.description) {
        query += ` AND t.description LIKE ?`;
        params.push(`%${filters.description}%`);
      }
      if (filters.minValue !== undefined && filters.minValue !== null && filters.minValue !== '') {
        query += ` AND t.value >= ?`;
        params.push(filters.minValue);
      }
      if (filters.maxValue !== undefined && filters.maxValue !== null && filters.maxValue !== '') {
        query += ` AND t.value <= ?`;
        params.push(filters.maxValue);
      }
    }

    query += ` ORDER BY t.date ASC`; // Export usually sorted by date ascending

    const transactions = await db.prepare(query).all(...params) as any[];

    // Validate Integration Codes
    const missingIntegrationCode: string[] = [];

    transactions.forEach(t => {
        // Check Category Integration Code
        if (!t.category_integration_code) {
            const label = `Categoria: ${t.category_name || 'Sem nome'}`;
            if (!missingIntegrationCode.includes(label)) {
                missingIntegrationCode.push(label);
            }
        }
        // Check Account Integration Code (if account exists)
        if (t.account_id && !t.account_integration_code) {
             const label = `Conta: ${t.account_name || 'Sem nome'}`;
             if (!missingIntegrationCode.includes(label)) {
                 missingIntegrationCode.push(label);
             }
        }
    });

    if (missingIntegrationCode.length > 0) {
        // Limit the number of items shown in error message
        const limit = 5;
        const shown = missingIntegrationCode.slice(0, limit);
        const remaining = missingIntegrationCode.length - limit;
        
        let message = `Exportação bloqueada! As seguintes categorias/contas não possuem Código de Integração: ${shown.join(', ')}`;
        if (remaining > 0) {
            message += ` e mais ${remaining} itens.`;
        }
        message += ' Por favor, adicione os códigos de integração antes de exportar.';
        
        return { error: message };
    }

    // 2. Generate CSV Content
    const header = 'DATA;DÉBITO;CRÉDITO;HISTÓRICO;DESCRIÇÃO; VALOR';
    const rows = transactions.map(t => {
      const date = new Date(t.date);
      const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
      
      const value = parseFloat(t.value);
      const absValue = Math.abs(value);
      const formattedValue = absValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // Determine Debit/Credit codes
      const categoryCode = t.category_integration_code;
      const accountCode = t.account_integration_code || '';

      let debit = '';
      let credit = '';

      if (value > 0) {
        // Entrada (Positive)
        // Debit: Account (Bank/Cash increases)
        // Credit: Category (Revenue increases)
        debit = accountCode;
        credit = categoryCode;
      } else {
        // Saída (Negative)
        // Debit: Category (Expense increases)
        // Credit: Account (Bank/Cash decreases)
        debit = categoryCode;
        credit = accountCode;
      }

      const historicoCode = '0'; // Fixed value

      // Description logic: 
      // "Descrição, se o valor de categoria for igual ao do histórico vai pegar só a categoria; 
      // se não vai pegar categoria mais o histórico"
      // Note: "histórico" in user prompt likely refers to transaction description.
      // t.category_name vs t.description
      let description = '';
      if (t.category_name === t.description) {
        description = t.category_name || '';
      } else {
        description = `${t.category_name || ''} ${t.description || ''}`.trim();
      }

      // Sanitize description for CSV (remove semicolons/newlines)
      description = description.replace(/;/g, ' ').replace(/(\r\n|\n|\r)/gm, ' ');

      return `${formattedDate};${debit};${credit};${historicoCode};${description}; ${formattedValue}`;
    });

    const csvContent = [header, ...rows].join('\n');

    return { csv: csvContent };
  } catch (error) {
    console.error('Error exporting transactions:', error);
    return { error: 'Erro ao gerar arquivo de exportação' };
  }
}

export async function parseEklesiaCategoriesPDF(formData: FormData, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  const file = formData.get('file') as File;
  if (!file) return { error: 'Arquivo não fornecido' };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await parsePDF(buffer);
    // const data: any = { lines: [] }; // STUB
    
    // Use structured lines for bold detection
    let linesToProcess: Array<{text: string, isBold?: boolean}> = [];
    if (data.lines && data.lines.length > 0) {
        linesToProcess = data.lines;
    } else {
        // Fallback
        linesToProcess = data.text.split('\n').map(t => ({ text: t, isBold: true }));
    }

    const categoriesToInsert: any[] = [];
    let currentNature: 'Entrada' | 'Saída' = 'Entrada';

    for (const lineObj of linesToProcess) {
      const trimmed = lineObj.text.trim();
      if (!trimmed) continue;

      if (trimmed.toUpperCase().includes('ENTRADAS') || trimmed.toUpperCase().includes('RECEITAS')) {
        currentNature = 'Entrada';
        continue;
      }
      if (trimmed.toUpperCase().includes('SAÍDAS') || trimmed.toUpperCase().includes('SAIDAS') || trimmed.toUpperCase().includes('DESPESAS')) {
        currentNature = 'Saída';
        continue;
      }

      // Rule: Only import Bold (Analytic). Ignore Non-Bold (Synthetic).
      if (data.lines && data.lines.length > 0 && !lineObj.isBold) {
           continue; 
      }

      // Format: Code + Description + [ReducedCode]
      // Regex to capture Code, Description, ReducedCode
      // Pattern: Code (digits/dots) + Space + Description + [Space + ReducedCode (digits)]
      const match = trimmed.match(/^([\d\.]+)\s+(.+?)(\s+(\d+))?$/);

      if (match) {
        const code = match[1].replace(/^0+/, '');
        const description = match[2].trim();
        const reducedCodeStr = match[4];

        // Ignore totals, dates, page numbers
        if (description.toUpperCase().startsWith('TOTAL')) continue;
        if (code.includes('/')) continue; // Date
        if (!code.includes('.') && code.length < 3) continue; // Likely page number
        
        // Ignore zero codes
        if (code === '0' || /^0+$/.test(code.replace(/\./g, ''))) continue;

        let integrationCode = reducedCodeStr || '';
        if (integrationCode) {
            integrationCode = integrationCode.replace(/^0+/, '');
            if (!integrationCode) integrationCode = '';
        }

        // Heuristic: If integrationCode is empty, but 'code' looks like a reduced code (no dots, just digits), use it.
        if (!integrationCode && code && !code.includes('.') && /^\d+$/.test(code)) {
             integrationCode = code;
        }

        // Use the Reduced Code as integration_code if available, else maybe the main code?
    // User said: "esse código reduzido deverá ser importado para o campo Cód. Interno no Vision."
    // And "ignore non-bold".

    categoriesToInsert.push({
        code: code,
        description: description,
        integration_code: integrationCode,
        nature: currentNature
    });
  }
}

    return { success: categoriesToInsert };
  } catch (error: any) {
    console.error('Error parsing Categories PDF:', error);
    return { error: `Erro ao processar PDF: ${error.message}` };
  }
}

export async function saveCategoriesBatch(categories: any[], companyId: string) {
    const session = await getSession();
    if (!session) return { error: 'Não autorizado' };
  
    const targetCompanyId = companyId || session.active_company_id;
    if (!targetCompanyId) return { error: 'Empresa não selecionada' };

    let count = 0;

    try {
        for (const cat of categories) {
            // eklesia_categories: description TEXT, integration_code VARCHAR(20)
            // Removed truncation of description to support long names as requested
            const safeDescription = cat.description.trim();
            const safeIntegrationCode = cat.integration_code ? cat.integration_code.substring(0, 20) : null;

            // Check existence by Description + Nature (Primary Key for User Intent)
            // We ignore integration_code for matching because Eklesia report may duplicate it for different categories
            let existing = await db.prepare(`
                SELECT id FROM eklesia_categories 
                WHERE company_id = ? AND description = ? AND nature = ?
            `).get(targetCompanyId, safeDescription, cat.nature);

            if (existing) {
                // Update existing category (update integration_code)
                await db.prepare(`
                    UPDATE eklesia_categories 
                    SET integration_code = ?
                    WHERE id = ?
                `).run(safeIntegrationCode, existing.id);
            } else {
                // Generate Vision internal code
                const startCode = cat.nature === 'Entrada' ? 800000 : 900000;
                const endCode = cat.nature === 'Entrada' ? 899999 : 999999;
                
                const result = await db.prepare(`
                  SELECT MAX(CAST(code AS INTEGER)) as max_code 
                  FROM eklesia_categories 
                  WHERE company_id = ? AND CAST(code AS INTEGER) BETWEEN ? AND ?
                `).get(targetCompanyId, startCode, endCode) as { max_code: number | null };

                let nextCode = (result && result.max_code) ? result.max_code + 1 : startCode;

                const id = uuidv4();
                await db.prepare(`
                    INSERT INTO eklesia_categories (id, company_id, code, description, integration_code, nature)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(id, targetCompanyId, String(nextCode), safeDescription, safeIntegrationCode, cat.nature);
                
                count++;
            }
        }
        revalidatePath('/admin/integrations/eklesia');
        return { success: true, count };
    } catch (error: any) {
        console.error('Error saving categories batch:', error);
        return { error: `Erro ao salvar categorias: ${error.message || error}` };
    }
}

export async function parseEklesiaAccountsPDF(formData: FormData, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  const file = formData.get('file') as File;
  if (!file) return { error: 'Arquivo não fornecido' };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await parsePDF(buffer);
    // const data: any = { lines: [], text: '' }; // STUB
    
    // Use structured lines if available for bold detection
    let linesToProcess: Array<{text: string, isBold?: boolean}> = [];
    let hasAnyBold = false;

    if (data.lines && data.lines.length > 0) {
        linesToProcess = data.lines;
        hasAnyBold = data.lines.some(l => l.isBold);
        // console.log(`[Eklesia Accounts] Detected ${data.lines.length} lines. Has bold: ${hasAnyBold}`);
    } else {
        // Fallback: assume all are relevant if we can't detect bold
        linesToProcess = data.text.split('\n').map(t => ({ text: t, isBold: true }));
        // console.log(`[Eklesia Accounts] Fallback to text split. ${linesToProcess.length} lines.`);
    }

    const accountsToInsert: any[] = [];

    for (const lineObj of linesToProcess) {
      const trimmed = lineObj.text.trim();
      if (!trimmed) continue;

      // User Rules:
      // 1. Import only Analytic (Bold). 
      // 2. Analytic usually has a Reduced Code. Synthetic usually doesn't.
      // 3. Ignore if Synthetic (Non-Bold).
      
      // Filter by Bold only if we actually detected bold lines in the document
      if (hasAnyBold && !lineObj.isBold) {
           continue; 
      }

      // 4. Reduced Code -> Internal Code. 
      // 5. If Reduced Code is 0 or empty -> Internal Code = null.
      
      // Pattern: Code (digits/dots) + Space + Description + [Space + ReducedCode (digits)] + [Anything else]
      // Example: 1.1.01.001     CAIXA GERAL      5
      // Synthetic: 1.1          ATIVO
      // Robust Regex:
      // ^([\d\.]+)   -> Start with code (digits and dots)
      // \s+          -> Separator
      // (.+?)        -> Description (lazy, capture until...)
      // (?:\s+(\d+))? -> Optional Reduced Code (space + digits)
      // .*$          -> Ignore trailing characters (like Balance, D/C, etc.)
      const match = trimmed.match(/^([\d\.]+)\s+(.+?)(?:\s+(\d+))?.*$/);
      
      if (match) {
        const code = match[1].replace(/^0+/, '');
        const description = match[2].trim();
        const reducedCodeStr = match[3]; // Group 3 is now the digits if present (was 4)
        
        let integrationCode = reducedCodeStr || '';
        
        // Check if reduced code is effectively zero or empty
        if (!integrationCode || /^0+$/.test(integrationCode)) {
            integrationCode = ''; // "deixe o campo em branco"
        }

        // Heuristic: If integrationCode is empty, but 'code' looks like a reduced code (no dots, just digits), use it.
        if (!integrationCode && code && !code.includes('.') && /^\d+$/.test(code)) {
             integrationCode = code;
        }

        accountsToInsert.push({
            code: code, // Keep the PDF code structure (e.g. 1.1.01)
            description: description,
            integration_code: integrationCode || null
        });
      } else {
        // Even if bold, if it doesn't match the analytic pattern (with reduced code), skip it.
        // But bold usually implies analytic.
        // If it's bold but no reduced code? Maybe "1.1.01.001 CAIXA GERAL" without code?
        // Let's stick to the regex requiring reduced code as a secondary validation.
        continue;
      }
    }

    return { success: accountsToInsert };
  } catch (error: any) {
    console.error('Error parsing Accounts PDF:', error);
    return { error: `Erro ao processar PDF: ${error.message}` };
  }
}

export async function saveAccountsBatch(accounts: any[], companyId: string) {
    const session = await getSession();
    if (!session) return { error: 'Não autorizado' };
  
    const targetCompanyId = companyId || session.active_company_id;
    if (!targetCompanyId) return { error: 'Empresa não selecionada' };

    let count = 0;

    try {
        for (const acc of accounts) {
            const safeIntegrationCode = acc.integration_code ? acc.integration_code.substring(0, 20) : null;

            const existing = await db.prepare(`
                SELECT id FROM eklesia_accounts 
                WHERE company_id = ? AND code = ?
            `).get(targetCompanyId, acc.code);

            if (existing) {
                await db.prepare(`
                    UPDATE eklesia_accounts 
                    SET description = ?, integration_code = ?
                    WHERE id = ?
                `).run(acc.description, safeIntegrationCode, existing.id);
            } else {
                const id = uuidv4();
                await db.prepare(`
                    INSERT INTO eklesia_accounts (id, company_id, code, description, integration_code)
                    VALUES (?, ?, ?, ?, ?)
                `).run(id, targetCompanyId, acc.code, acc.description, safeIntegrationCode);
                
                count++;
            }
        }
        revalidatePath('/admin/integrations/eklesia');
        return { success: true, count };
    } catch (error: any) {
        console.error('Error saving accounts batch:', error);
        return { error: `Erro ao salvar contas: ${error.message || error}` };
    }
}

export async function parseEklesiaPdf(formData: FormData, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  const file = formData.get('file') as File;
  if (!file) return { error: 'Arquivo não fornecido' };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // console.log('Starting PDF parse (Razão Gerencial)...');
    
    const data = await parsePDF(buffer);
    let lines: string[] = [];
    
    if (data.lines && data.lines.length > 0) {
        lines = data.lines.map(l => l.text);
    } else {
        lines = data.text.split('\n');
    }
    
    const categories = await getCategories(targetCompanyId);
    const accounts = await getAccounts(targetCompanyId);
    
    // Sort for better matching
    categories.sort((a, b) => b.description.length - a.description.length);
    accounts.sort((a, b) => b.description.length - a.description.length);

    const transactionsToInsert: any[] = [];
    const ignoredLines: any[] = [];

    let currentCategory: { id: string, name: string } | null = null;
    let isEntradaBlock = true; // Default, will be updated by headers

    // Regex for Category Header: Code + Description + Value
    // We allow flexible code (digits/dots)
    const categoryHeaderRegex = /^([\d\.]+)\s+(.+?)\s+(-?[\d\.,]+)$/;

    // Regex for Transaction Line: 
    // Date + Description + Value + [D/C] + [Balance]
    // We try to capture the essential parts.
    // Date: dd/mm/yyyy
    // Value: 1.234,56 or -1.234,56
    // D/C: D or C (Optional if block logic is used)
    
    // Improved Regex:
    // Start with Date
    // Middle: Description (greedy)
    // End: Value (required) + [Space + D/C] + [Space + Balance]
    const lineRegex = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?[\d\.,]+)(\s+([DC]))?(\s+[\d\.,]+)?$/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check for Block Headers
        if (trimmed.toUpperCase().includes('ENTRADAS') || trimmed.toUpperCase().includes('RECEITAS')) {
            isEntradaBlock = true;
            continue;
        }
        if (trimmed.toUpperCase().includes('SAÍDAS') || trimmed.toUpperCase().includes('SAIDAS') || trimmed.toUpperCase().includes('DESPESAS')) {
            isEntradaBlock = false;
            continue;
        }

        // 1. Try to match Transaction Line
        const lineMatch = trimmed.match(lineRegex);
        if (lineMatch) {
            if (!currentCategory) {
                 // Try to recover category from previous lines if needed, or just skip
                 continue;
            }

            const dateStr = lineMatch[1];
            const descriptionRaw = lineMatch[2].trim(); // Middle content
            const valueStr = lineMatch[3];
            const dc = lineMatch[5]; // Group 5 is D/C if present
            
            // Parse Date
            const [day, month, year] = dateStr.split('/');
            const isoDate = `${year}-${month}-${day}`;

            // Parse Value
            // Remove dots (thousands), replace comma with dot
            let valueNum = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
            
            // Adjust sign logic:
            // Priority 1: Block Logic (Entrada vs Saída)
            // Priority 2: D/C if present and contradicts block? Or D/C confirms?
            // Usually D/C is strictly accounting (D=Debito, C=Credito).
            // In Assets: D is + (Increase), C is - (Decrease)
            // In Liabilities/Equity: C is +, D is -
            // In Revenue (Receitas): C is +, D is - (deductions)
            // In Expenses (Despesas): D is +, C is - (reversals)
            
            // However, "Entradas" block usually means positive cash flow. "Saídas" means negative.
            // So we can simplify:
            // If Entrada Block -> Positive
            // If Saída Block -> Negative
            
            // But if D/C is present, does it override?
            // Example: A refund in "Saídas" block might be C (Credit)? That would be positive cash flow (money back).
            // Example: A cancellation in "Entradas" might be D (Debit)? That would be negative.
            
            // Let's use D/C if present as the source of truth for sign relative to nature?
            // Or just trust the Block?
            // The user said: "o relatório em pdf também faz a distinção entre entradas e saídas por bloco considere isso".
            // This implies the block is the key differentiator.
            
            // Implementation:
            // Base sign on Block.
            // If Block is Saída, value should be negative.
            // If Block is Entrada, value should be positive.
            
            // What if valueStr is already negative? e.g. "-100,00"
            // We take absolute value first.
            valueNum = Math.abs(valueNum);
            
            if (!isEntradaBlock) {
                valueNum = -valueNum;
            }
            
            // If D/C is present, maybe handle special cases?
            // For now, trust the block as requested.

            // Extract Account from Description if present
            let accountId = null;
            let accountName = '';
            let finalDescription = descriptionRaw;

            // Heuristic: If description contains a known account name at the end
            for (const acc of accounts) {
                if (finalDescription.includes(acc.description)) {
                     accountId = acc.id;
                     accountName = acc.description;
                     break; 
                }
            }

            transactionsToInsert.push({
                id: uuidv4(),
                company_id: targetCompanyId,
                category_id: currentCategory.id,
                categoryName: currentCategory.name,
                account_id: accountId,
                accountName: accountName,
                date: isoDate,
                description: finalDescription,
                original_description: trimmed,
                value: valueNum
            });
            continue;
        }

        // 2. Check for Category Header
        // Format: Code Description Value(Total?)
        // e.g. 1.01.01 DIZIMOS 1.000,00
        const catMatch = trimmed.match(categoryHeaderRegex);
        if (catMatch) {
            const code = catMatch[1].replace(/^0+/, '');
            const description = catMatch[2].trim();
            
            // Validate if it looks like a category
            if (code.length < 3 || description.toUpperCase() === 'TOTAL') continue;

            // Find category
            let cat = categories.find(c => c.integration_code === code);
            if (!cat) {
                // Try fuzzy match on description
                cat = categories.find(c => c.description.toUpperCase() === description.toUpperCase());
            }

            if (cat) {
                currentCategory = { id: cat.id, name: cat.description };
            } else {
                // console.warn(`Category not found for header: ${code} - ${description}`);
                currentCategory = null; 
            }
            continue;
        }
    }

    return { 
        success: transactionsToInsert, 
        ignored: ignoredLines 
    };

  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    return { error: `Erro ao processar o arquivo PDF: ${error.message}` };
  }
}

export async function saveTransactions(transactions: any[], companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  if (!transactions || transactions.length === 0) {
      return { success: true };
  }

  try {
    const stmt = db.prepare(`
        INSERT INTO eklesia_transactions (id, company_id, category_id, account_id, date, description, original_description, value)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction(async (txs: any[]) => {
        for (const t of txs) {
            // Ensure we have a new ID if not provided (though parse generates it)
            const id = t.id || uuidv4();
            await stmt.run(id, targetCompanyId, t.category_id, t.account_id || null, t.date, t.description, t.original_description || t.description, t.value);
        }
    });

    await insertMany(transactions);
    
    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error) {
    console.error('Error saving transactions:', error);
    return { error: 'Erro ao salvar lançamentos' };
  }
}
