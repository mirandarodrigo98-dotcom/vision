'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import parsePDF from '@/lib/pdf-parser';
import PDFParser from 'pdf2json';

const categorySchema = z.object({
  description: z.string().max(50, 'A descrição deve ter no máximo 50 caracteres'),
  integration_code: z.string().max(20, 'O código de integração deve ter no máximo 20 caracteres').optional(),
  nature: z.enum(['Saída', 'Entrada', 'Transferência'], { errorMap: () => ({ message: 'Natureza inválida' }) }),
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
        query += ` AND code ILIKE ?`;
        params.push(`%${filters.code}%`);
      }
      if (filters.description) {
        query += ` AND description ILIKE ?`;
        params.push(`%${filters.description}%`);
      }
      if (filters.integration_code) {
        query += ` AND integration_code ILIKE ?`;
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
    const result = await db.prepare(`
      SELECT MAX(CAST(code AS INTEGER)) as max_code 
      FROM eklesia_accounts 
      WHERE company_id = ?
    `).get(targetCompanyId) as { max_code: number | null };

    let nextCode = 1;
    if (result && result.max_code) {
      nextCode = result.max_code + 1;
    }

    const id = uuidv4();
    await db.prepare(`
      INSERT INTO eklesia_accounts (id, company_id, code, description, integration_code)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      targetCompanyId,
      String(nextCode),
      data.description,
      data.integration_code || null
    );

    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error) {
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

// PDF Parsing Functions
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
    // const data: any = { lines: [], text: '' }; // STUB
    
    // Determine which lines are bold (Analytic)
    // pdf-parser should return { lines: [ { text: "...", isBold: true/false } ] } if extended
    // Current parsePDF implementation might need adjustment if it returns simple text.
    // Assuming parsePDF returns object with text and potentially style info or we use a heuristic.
    // If parsePDF only returns text, we can't detect bold. 
    // BUT, the user explicitly said "as contas em negrito são as contas analiticas".
    // I previously updated pdf-parser.ts to support this.
    
    // console.log('Parsed PDF Data Sample:', data.text.substring(0, 200));

    let linesToProcess: Array<{text: string, isBold?: boolean}> = [];
    let hasAnyBold = false;

    if (data.lines && data.lines.length > 0) {
        linesToProcess = data.lines;
        hasAnyBold = data.lines.some(l => l.isBold);
        // console.log(`Detected ${data.lines.length} lines. Has bold: ${hasAnyBold}`);
    } else {
        // Fallback: assume all are relevant if we can't detect bold
        linesToProcess = data.text.split('\n').map(t => ({ text: t, isBold: true }));
        // console.log(`Fallback to text split. ${linesToProcess.length} lines.`);
    }

    const categoriesToInsert: any[] = [];
    
    // Heuristic for Nature (Entry/Exit)
    // We can track headers "DESPESAS" / "RECEITAS" to switch context
    let currentNature: 'Saída' | 'Entrada' = 'Saída'; // Default to Saída (Despesas) often come last or first?
    // Actually, usually Receipts (Entradas) come first, then Expenses (Saídas).
    // Let's try to detect keywords.
    
    for (const lineObj of linesToProcess) {
      const line = lineObj.text.trim();
      if (!line) continue;

      // Detect Context Switch
      if (line.match(/RECEITAS|ENTRADAS/i)) {
          currentNature = 'Entrada';
          continue;
      }
      if (line.match(/DESPESAS|SAIDAS|SAÍDAS/i)) {
          currentNature = 'Saída';
          continue;
      }

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
      
      // Pattern: Code (digits/dots) + Space + Description + [Space + ReducedCode (digits)]
      // Example: 1.1.01.001     Dízimos      5
      // Synthetic: 1.1          Receitas
      
      // Regex to capture:
      // Group 1: Code (digits and dots)
      // Group 2: Description (text)
      // Group 3: Reduced Code (digits at end) - Optional
      const match = line.match(/^([\d\.]+)\s+(.+?)(?:\s+(\d+))?$/);
      
      if (match) {
        const code = match[1];
        const description = match[2].trim();
        const reducedCodeStr = match[3];
        
        let integrationCode = reducedCodeStr || '';
        if (integrationCode) {
            integrationCode = integrationCode.replace(/^0+/, '');
            if (!integrationCode) integrationCode = '';
        }

        // Heuristic: If integrationCode is empty, but 'code' looks like a reduced code (no dots, just digits), use it.
        if (!integrationCode && code && !code.includes('.') && /^\d+$/.test(code)) {
             integrationCode = code.replace(/^0+/, '');
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

      // New Pattern Check: "Listagem das Contas Correntes com Reduzido"
      // Format: ReducedCode Code-Description
      // Example: 00000005 10-CAIXA GERAL
      // Regex: ^(\d+)\s+(.+)$
      // Group 1: Reduced Code (digits, typically padded with zeros)
      // Group 2: Full Description (including Code prefix)
      const listMatch = trimmed.match(/^(\d+)\s+(.+)$/);
      if (listMatch) {
          const reducedCodeStr = listMatch[1];
          const fullDescription = listMatch[2].trim();
          
          let integrationCode = reducedCodeStr.replace(/^0+/, '');
          if (!integrationCode) integrationCode = '';

          // Extract code from fullDescription (e.g. "10" from "10-CAIXA GERAL")
          // Assuming format is "CODE-DESCRIPTION"
          let code = integrationCode; // Fallback to integration code if parsing fails
          const codeMatch = fullDescription.match(/^([\w\.-]+)\s*-/);
          if (codeMatch) {
              code = codeMatch[1];
          }

          accountsToInsert.push({
              code: code.replace(/^0+/, ''),
              description: fullDescription, // User explicitly requested full description: "10-CAIXA GERAL"
              integration_code: integrationCode || null
          });
          continue; // Successfully parsed as list format
      }

      // User Rules (Old/Standard Pattern):
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
             integrationCode = code.replace(/^0+/, '');
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

import Papa from 'papaparse';

export async function parseEklesiaPdf(formData: FormData, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  const file = formData.get('file') as File;
  if (!file) return { error: 'Arquivo não fornecido' };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse PDF directly to preserve column spacing
    const lines: string[] = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1 as any);
        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            let extractedLines: string[] = [];
            if (pdfData && pdfData.Pages) {
                pdfData.Pages.forEach((page: any) => {
                    let pageLines: any[] = [];
                    if (page.Texts) {
                        page.Texts.forEach((t: any) => {
                            let textStr = decodeURIComponent(t.R[0].T);
                            let y = t.y;
                            let x = t.x;
                            let line = pageLines.find(l => Math.abs(l.y - y) < 0.3);
                            if (!line) {
                                line = { y: y, items: [] };
                                pageLines.push(line);
                            }
                            line.items.push({ x: x, text: textStr });
                        });
                        pageLines.sort((a, b) => a.y - b.y);
                        pageLines.forEach(l => {
                            l.items.sort((a: any, b: any) => a.x - b.x);
                            let lineText = l.items.map((i: any) => i.text).join('   ');
                            extractedLines.push(lineText);
                        });
                    }
                });
            }
            resolve(extractedLines);
        });
        pdfParser.parseBuffer(buffer);
    });

    const categories = await getCategories(targetCompanyId);
    const accounts = await getAccounts(targetCompanyId);
    
    // Sort for better matching
    categories.sort((a, b) => b.description.length - a.description.length);
    accounts.sort((a, b) => b.description.length - a.description.length);

    const transactionsToInsert: any[] = [];
    const ignoredTransactions: any[] = [];

    let currentCategory: { id: string, name: string } | null = null;
    let ignoreBlock = false;
    let pendingTransaction: any = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.includes('0000004904 TRANSFERÊNCIAS/DEPÓSITOS')) {
            ignoreBlock = true;
            continue;
        }

        // Category header: "0000002654   DÍZIMOS       75.487,02"
        const catMatch = line.match(/^(\d{10})\s+(.+)$/);
        if (catMatch && !line.match(/^\d{2}\/\d{2}\/\d{4}/)) {
            let integrationCode = catMatch[1];
            if (parseInt(integrationCode, 10) === 0) {
                integrationCode = '0';
            } else {
                integrationCode = parseInt(integrationCode, 10).toString();
            }
            
            let catName = catMatch[2].trim();
            catName = catName.replace(/\s+[-0-9\.,]+(?:\s+[CD])?$/, '').trim();

            // Try to match with existing categories
            let matchedCat = null;
            if (integrationCode !== '0') {
                matchedCat = categories.find(c => c.integration_code === integrationCode);
            }
            if (!matchedCat) {
                matchedCat = categories.find(c => c.description.toUpperCase() === catName.toUpperCase());
            }

            if (matchedCat) {
                currentCategory = { id: matchedCat.id, name: matchedCat.description };
            } else {
                currentCategory = { id: '', name: catName }; 
            }
            continue;
        }

        // Transaction line 1
        const transMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d+)\s+(.+?)\s{2,}(.+?)\s{2,}(.+?)\s{2,}([-0-9\.,]+)\s+[CD]\s+[-0-9\.,]+$/);
        if (transMatch) {
            if (ignoreBlock) continue;
            
            const dateStr = transMatch[1];
            const fornecedor = transMatch[3].trim();
            const conta = transMatch[4].trim();
            const valorStr = transMatch[6].replace(/\./g, '').replace(',', '.');
            const valor = Math.abs(parseFloat(valorStr)); // ignore negative sign

            // Match account
            let accountId = null;
            let accountName = null;
            const matchedAccount = accounts.find(a => conta.toUpperCase().includes(a.description.toUpperCase()) || a.description.toUpperCase().includes(conta.toUpperCase()));
            if (matchedAccount) {
                accountId = matchedAccount.id;
                accountName = matchedAccount.description;
            }

            pendingTransaction = {
                date: convertDate(dateStr),
                fornecedor,
                conta,
                valor,
                category: currentCategory,
                accountId,
                accountName
            };
            continue;
        }

        // Transaction line 2: Centro de Custo / Histórico
        if (pendingTransaction) {
            let centroCusto = '';
            let historico = '';

            if (line.includes('/')) {
                const parts = line.split('/');
                centroCusto = parts[0].trim();
                historico = parts.slice(1).join('/').trim();
            } else {
                centroCusto = line.trim();
                historico = '';
            }

            let catName = pendingTransaction.category ? pendingTransaction.category.name : 'Desconhecida';
            let composedHistorico = `${catName} = ${centroCusto}`;
            if (historico) {
                composedHistorico += ` / ${historico}`;
            }

            if (pendingTransaction.category && pendingTransaction.category.id) {
                transactionsToInsert.push({
                    company_id: targetCompanyId,
                    category_id: pendingTransaction.category.id,
                    categoryName: pendingTransaction.category.name,
                    account_id: pendingTransaction.accountId,
                    accountName: pendingTransaction.accountName,
                    date: pendingTransaction.date,
                    description: composedHistorico,
                    value: pendingTransaction.valor,
                    original_description: pendingTransaction.fornecedor
                });
            } else {
                ignoredTransactions.push({
                    date: pendingTransaction.date,
                    value: pendingTransaction.valor,
                    reason: 'Categoria não encontrada ou não cadastrada no sistema',
                    line: `${pendingTransaction.fornecedor} - ${composedHistorico}`
                });
            }

            pendingTransaction = null;
        }
    }

    return { success: transactionsToInsert, ignored: ignoredTransactions, count: transactionsToInsert.length };

  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    return { error: `Erro ao processar arquivo: ${error.message}` };
  }
}

export async function parseEklesiaCsv(formData: FormData, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  const file = formData.get('file') as File;
  if (!file) return { error: 'Arquivo não fornecido' };

  try {
    const text = await file.text();
    
    // Parse CSV
    const parsed = Papa.parse(text, {
      skipEmptyLines: true,
      header: false,
      delimiter: '' // Let Papa Parse guess between comma, tab, pipe, semicolon
    });

    const rows = parsed.data as string[][];

    const categories = await getCategories(targetCompanyId);
    const accounts = await getAccounts(targetCompanyId);

    const transactionsToInsert: any[] = [];
    const ignoredTransactions: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i].map(col => typeof col === 'string' ? col.trim() : col);

      // Validate data column (A) - index 0
      const dateStr = row[0];
      if (!dateStr || !dateStr.match(/^\d{2}\/\d{2}\/(\d{2}|\d{4})$/)) {
        continue; // Ignore if not a valid date DD/MM/YYYY or DD/MM/YY
      }

      // Pre-validate that it's a real date
      const parts = dateStr.split('/');
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      
      if (isNaN(day) || isNaN(month) || isNaN(year) || month < 1 || month > 12 || day < 1 || day > 31) {
        continue; // Invalid date components
      }

      // Column D - Categoria
      const categoria = row[3] || '';
      if (categoria.toUpperCase().includes('TRANSFERÊNCIAS/DEPÓSITOS')) {
        continue;
      }

      // Column F - Conta
      const conta = row[5] || '';

      // Column G - Histórico
      const historicoG = row[6] || '';
      let historico = historicoG ? `${categoria} - ${historicoG}`.trim() : categoria;

      // Column H - Valor
      let valorStr = row[7] || '0';
      const isNegative = valorStr.includes('-');
      valorStr = valorStr.replace(/-/g, '').replace(/R\$\s?/g, '').replace(/\./g, '').replace(',', '.');
      const valor = parseFloat(valorStr);

      if (valor === 0 || isNaN(valor)) {
        continue; // Ignora se estiver zerado
      }

      // Match Category
      let categoryId = null;
      let categoryName = categoria;
      
      let matchedCat = categories.find(c => c.description.toUpperCase() === categoria.toUpperCase());
      if (matchedCat) {
        categoryId = matchedCat.id;
        categoryName = matchedCat.description;
      }

      // Match Account
      let accountId = null;
      let accountName = conta;
      let matchedAccount = accounts.find(a => conta.toUpperCase().includes(a.description.toUpperCase()) || a.description.toUpperCase().includes(conta.toUpperCase()));
      if (matchedAccount) {
        accountId = matchedAccount.id;
        accountName = matchedAccount.description;
      }

      if (categoryId) {
        transactionsToInsert.push({
            company_id: targetCompanyId,
            category_id: categoryId,
            categoryName: categoryName,
            account_id: accountId,
            accountName: accountName,
            date: convertDate(dateStr),
            description: historico,
            value: valor,
            original_description: historico
        });
      } else {
        ignoredTransactions.push({
            date: convertDate(dateStr),
            value: valor,
            isNegative: isNegative,
            originalCategory: categoria,
            reason: 'Categoria não encontrada ou não cadastrada no sistema',
            line: `${historico} - Categoria Original: ${categoria}`
        });
      }
    }

    return { success: transactionsToInsert, ignored: ignoredTransactions, count: transactionsToInsert.length };

  } catch (error: any) {
    console.error('Error parsing CSV:', error);
    return { error: `Erro ao processar arquivo: ${error.message}` };
  }
}

function convertDate(dateStr: string): string {
    // DD/MM/YYYY -> YYYY-MM-DD
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        let year = parts[2];
        if (year.length === 2) year = '20' + year;
        return `${year}-${parts[1]}-${parts[0]}`;
    }
    return new Date().toISOString().split('T')[0]; // Fallback
}

export async function saveTransactionsBatch(transactions: any[], companyId: string) {
    const session = await getSession();
    if (!session) return { error: 'Não autorizado' };
  
    const targetCompanyId = companyId || session.active_company_id;
    if (!targetCompanyId) return { error: 'Empresa não selecionada' };

    let count = 0;

    try {
        const stmt = db.prepare(`
            INSERT INTO eklesia_transactions (id, company_id, category_id, account_id, date, description, value)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const insertTransaction = db.transaction((txs) => {
            for (const t of txs) {
                stmt.run(uuidv4(), targetCompanyId, t.category_id, t.account_id, t.date, t.description, t.value);
                count++;
            }
        });

        insertTransaction(transactions);
        revalidatePath('/admin/integrations/eklesia');
        return { success: true, count };
    } catch (error: any) {
        console.error('Error saving transactions batch:', error);
        return { error: `Erro ao salvar lançamentos: ${error.message}` };
    }
}

export async function deleteCategoriesBatch(ids: string[], companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  if (!ids || ids.length === 0) return { error: 'Nenhuma categoria selecionada' };

  try {
    const placeholders = ids.map(() => '?').join(',');
    const query = `DELETE FROM eklesia_categories WHERE id IN (${placeholders}) AND company_id = ?`;
    
    await db.prepare(query).run(...ids, targetCompanyId);
    
    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error) {
    console.error('Error deleting categories batch:', error);
    return { error: 'Erro ao excluir categorias em lote' };
  }
}

export async function deleteAccountsBatch(ids: string[], companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  if (!ids || ids.length === 0) return { error: 'Nenhuma conta selecionada' };

  try {
    const placeholders = ids.map(() => '?').join(',');
    const query = `DELETE FROM eklesia_accounts WHERE id IN (${placeholders}) AND company_id = ?`;
    
    await db.prepare(query).run(...ids, targetCompanyId);
    
    revalidatePath('/admin/integrations/eklesia');
    return { success: true };
  } catch (error) {
    console.error('Error deleting accounts batch:', error);
    return { error: 'Erro ao excluir contas em lote' };
  }
}

export async function exportTransactionsCsv(
  companyId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    accountId?: string;
    description?: string;
  }
) {
    const session = await getSession();
    if (!session) return { error: 'Não autorizado' };

    const targetCompanyId = companyId || session.active_company_id;
    if (!targetCompanyId) return { error: 'Empresa não selecionada' };

    try {
        let query = `
            SELECT 
                t.date,
                c.description as category_name,
                c.nature as category_nature,
                t.description,
                t.value,
                a.description as account_name,
                a.integration_code as account_code
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
        }

        query += ` ORDER BY t.date DESC`;

        const transactions = await db.prepare(query).all(...params) as any[];

        // Generate CSV
        const header = ['Data', 'Categoria', 'Natureza', 'Histórico', 'Valor', 'Conta', 'Cód. Conta'];
        const rows = transactions.map(t => [
            t.date ? (() => {
              const d = new Date(t.date + 'T12:00:00');
              return !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '';
            })() : '',
            t.category_name || '',
            t.category_nature || '',
            t.description || '',
            t.value ? t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00',
            t.account_name || '',
            t.account_code || ''
        ]);

        const csvContent = [
            header.join(';'),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
        ].join('\n');

        return { success: true, csv: csvContent };

    } catch (error) {
        console.error('Error exporting transactions:', error);
        return { error: 'Erro ao exportar lançamentos' };
    }
}
