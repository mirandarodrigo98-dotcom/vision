'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { PDFParse } from 'pdf-parse';
import path from 'path';
import { pathToFileURL } from 'url';

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
  created_at: string;
};

export async function getCategories(companyId: string) {
  const session = await getSession();
  if (!session) return [];

  // If no companyId provided, try to fallback to session (though UI should enforce selection)
  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return [];

  const categories = await db.prepare(`
    SELECT * FROM enuves_categories 
    WHERE company_id = ? 
    ORDER BY code ASC
  `).all(targetCompanyId) as Category[];

  return categories;
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
      FROM enuves_categories 
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
      FROM enuves_categories 
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
      INSERT INTO enuves_categories (id, company_id, code, description, integration_code, nature)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      targetCompanyId,
      generatedCode,
      data.description,
      data.integration_code || null,
      data.nature
    );

    revalidatePath('/admin/integrations/enuves');
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
      UPDATE enuves_categories 
      SET description = ?, integration_code = ?
      WHERE id = ? AND company_id = ?
    `).run(
      data.description,
      data.integration_code || null,
      data.id,
      targetCompanyId
    );

    revalidatePath('/admin/integrations/enuves');
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
    await db.prepare('DELETE FROM enuves_categories WHERE id = ? AND company_id = ?').run(id, targetCompanyId);
    revalidatePath('/admin/integrations/enuves');
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { error: 'Erro ao excluir categoria' };
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
  // Lista atualmente vazia; pode ser preenchida futuramente com categorias padrão de Entrada.
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

    let minCode = nature === 'Entrada' ? 800000 : 900000;
    
    // Check existing
    const existing = await db.prepare('SELECT description FROM enuves_categories WHERE company_id = ?').all(targetCompanyId) as { description: string }[];
    const existingSet = new Set(existing.map(e => e.description));

    let count = 0;
    
    // Need to find the next available code
    // Optimization: fetch max code once
    const result = await db.prepare(`
        SELECT MAX(CAST(code AS INTEGER)) as max_code 
        FROM enuves_categories 
        WHERE company_id = ? AND CAST(code AS INTEGER) >= ? AND CAST(code AS INTEGER) <= ?
    `).get(targetCompanyId, minCode, minCode + 99999) as { max_code: number | null };

    let nextCode = (result && result.max_code) ? result.max_code + 1 : minCode;

    for (const desc of listToUse) {
      if (!existingSet.has(desc)) {
        const id = uuidv4();
        await db.prepare(`
          INSERT INTO enuves_categories (id, company_id, code, description, nature)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, targetCompanyId, String(nextCode), desc, nature);
        nextCode++;
        count++;
      }
    }

    revalidatePath('/admin/integrations/enuves');
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
      FROM enuves_transactions t
      LEFT JOIN enuves_categories c ON t.category_id = c.id
      LEFT JOIN enuves_accounts a ON t.account_id = a.id
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
      UPDATE enuves_transactions
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

    revalidatePath('/admin/integrations/enuves');
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
    await db.prepare('DELETE FROM enuves_transactions WHERE id = ? AND company_id = ?').run(id, targetCompanyId);
    revalidatePath('/admin/integrations/enuves');
    return { success: true };
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return { error: 'Erro ao excluir lançamento' };
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
  created_at: string;
};

export async function getAccounts(companyId: string) {
  const session = await getSession();
  if (!session) return [];

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return [];

  try {
    const accounts = await db.prepare(`
      SELECT * FROM enuves_accounts 
      WHERE company_id = ? 
      ORDER BY CAST(code AS INTEGER) ASC
    `).all(targetCompanyId) as Account[];
    
    return accounts;
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
      FROM enuves_accounts 
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
      INSERT INTO enuves_accounts (id, company_id, code, description, integration_code)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      targetCompanyId,
      codeResult.nextCode,
      data.description,
      data.integration_code || null
    );

    revalidatePath('/admin/integrations/enuves');
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
      UPDATE enuves_accounts 
      SET description = ?, integration_code = ?
      WHERE id = ? AND company_id = ?
    `).run(
      data.description,
      data.integration_code || null,
      data.id,
      targetCompanyId
    );

    revalidatePath('/admin/integrations/enuves');
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
    await db.prepare('DELETE FROM enuves_accounts WHERE id = ? AND company_id = ?').run(id, targetCompanyId);
    revalidatePath('/admin/integrations/enuves');
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
      FROM enuves_transactions t
      LEFT JOIN enuves_categories c ON t.category_id = c.id
      LEFT JOIN enuves_accounts a ON t.account_id = a.id
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

export async function parseEnuvesPdf(formData: FormData, companyId: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autorizado' };

  const targetCompanyId = companyId || session.active_company_id;
  if (!targetCompanyId) return { error: 'Empresa não selecionada' };

  const file = formData.get('file') as File;
  if (!file) return { error: 'Arquivo não fornecido' };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Using pdf-parse v2.4.5 API
    console.log('Starting PDF parse...');
    
    // Explicitly set worker to avoid "fake worker" error in Next.js
    const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
    const workerUrl = pathToFileURL(workerPath).href;
    console.log('Setting worker path to:', workerUrl);
    PDFParse.setWorker(workerUrl);

    const parser = new PDFParse({ data: buffer });
    let text = '';
    
    try {
      console.log('Parser created, getting text...');
      const data = await parser.getText();
      console.log('Text extracted length:', data?.text?.length);
      text = data.text;
    } finally {
      await parser.destroy();
    }
    
    const categories = await getCategories(targetCompanyId);
    
    // Sort categories by length (descending) to match longest descriptions first
    categories.sort((a, b) => b.description.length - a.description.length);

    const accounts = await getAccounts(targetCompanyId);
    // Sort accounts by length (descending) to match longest descriptions first
    accounts.sort((a, b) => b.description.length - a.description.length);

    const transactionsToInsert: any[] = [];
    const ignoredLines: any[] = [];

    // Detect Layout
    // The new layout has explicit headers usually, but text extraction might vary.
    // We check for specific characteristics of the new layout (e.g. "Data" + "Descrição" + "Total" headers or tab structure)
    // Or simpler: The new layout uses dot for decimals (e.g. -619.13) while the old one uses comma (X.XXX,XX)
    // But let's check for headers first as it's safer.
    // We relax the check to just Data and Descrição as Total/Contato might be missing or extracted differently.
    const isNewLayout = (text.includes('Data') && text.includes('Descrição')) || text.includes('Data \tDescrição');

    if (isNewLayout) {
        console.log('Detected New PDF Layout (Tabular/Dot Decimal)');

        // 1. Cleanup Text (Fix fragmented lines due to PDF layout)
        // Fix Date split: "25/01/2" \n "026" -> "25/01/2026"
        text = text.replace(/(\d{2}\/\d{2}\/\d)\n(\d{3})/g, '$1$2');
        // Fix Value split: "-619.1" \n "3" -> "-619.13"
        text = text.replace(/(\d+\.\d)\n(\d)/g, '$1$2');
        // Fix Value split type 2: "-3260." \n "66" -> "-3260.66"
        text = text.replace(/(\d+\.)\n(\d+)/g, '$1$2');

        const lines = text.split('\n');
        
        let currentRecord: { date: string, rawText: string } | null = null;
        
        const processRecord = (record: { date: string, rawText: string }) => {
             const { date, rawText } = record;
             const [day, month, year] = date.split('/');
             const isoDate = `${year}-${month}-${day}`;

             // Find Value: Look for a number that stands alone or is negative, surrounded by whitespace/tabs/start/end
             // Regex for dot decimal: -123.45 or 123.45 or -123 or 123
             // We prioritize finding it.
             const valueRegex = /(?:^|\s|\t)(-?\d+(?:\.\d{1,2})?)(?=\s|\t|$)/;
             // Find the LAST matching number in the text? 
             // In "Energia elétrica (8/72) -619.13 LIGHT", (8/72) shouldn't match because of parens/slash not being whitespace.
             // But let's use `match` which returns first match.
             // We need to be careful about numbers in description.
             // Strategy: Split by tabs first? No, tabs are unreliable in extracted text sometimes.
             // Use the Regex on the full string (minus the Date prefix).
             
             const textWithoutDate = rawText.substring(date.length).trim();
             
             // Try to find the value
             const valueMatch = textWithoutDate.match(valueRegex);
             
             if (!valueMatch) {
                 ignoredLines.push({
                     line: rawText,
                     reason: 'Valor não encontrado (Novo Layout)',
                     date: isoDate,
                     value: null
                 });
                 return;
             }

             const valueStr = valueMatch[1];
             const valueNum = parseFloat(valueStr);
             const finalValue = Math.abs(valueNum);

             // Description is everything before the value match
             const valueIndex = textWithoutDate.indexOf(valueStr);
             let description = textWithoutDate.substring(0, valueIndex).trim();
             
             // Extract suffix for Account detection
             // The text AFTER the value typically contains the Account Name
             const suffix = textWithoutDate.substring(valueIndex + valueStr.length).trim();

             // Clean description
             description = description.replace(/\s+/g, ' ').trim();
             
             // Remove leading/trailing dashes or colons, but keep parens if matched
             description = description.replace(/^[\s\-\:]+|[\s\-\:]+$/g, '');

             if (!description) {
                  description = 'Sem descrição';
             }
             
             // Match Account
             let accountId = null;
             const normalizedSuffix = suffix.toUpperCase();
             
             for (const acc of accounts) {
                 const accDesc = acc.description.trim().toUpperCase();
                 // Check if suffix contains account name (it usually ends with it)
                 if (normalizedSuffix.includes(accDesc)) {
                     accountId = acc.id;
                     break;
                 }
             }

             const normalizedDesc = description.toUpperCase();
             let categoryId = null;

             for (const cat of categories) {
                 const catDesc = cat.description.trim().toUpperCase();
                 if (normalizedDesc.includes(catDesc) || catDesc === normalizedDesc) {
                     categoryId = cat.id;
                     break;
                 }
             }

             if (categoryId && accountId) {
                transactionsToInsert.push({
                    id: uuidv4(),
                    company_id: targetCompanyId,
                    category_id: categoryId,
                    account_id: accountId,
                    date: isoDate,
                    description: description,
                    original_description: description,
                    value: finalValue
                });
            } else {
                let reason = '';
                if (!categoryId && !accountId) reason = 'Categoria e Conta não identificadas';
                else if (!categoryId) reason = 'Categoria não identificada';
                else if (!accountId) reason = 'Conta não identificada';

                ignoredLines.push({
                     line: rawText,
                     reason: reason,
                     date: isoDate,
                     value: finalValue
                });
            }
        };

        for (const line of lines) {
             // Skip headers and page markers
             if (!line.trim() || line.includes('-- 1 of') || line.includes('-- 2 of') || line.includes('-- 3 of') || line.includes('-- 4 of') || line.startsWith('Data \tDescrição')) continue;

             const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/);
             if (dateMatch) {
                 if (currentRecord) {
                     processRecord(currentRecord);
                 }
                 currentRecord = {
                     date: dateMatch[1],
                     rawText: line
                 };
             } else {
                 if (currentRecord) {
                     currentRecord.rawText += ' ' + line;
                 }
             }
        }
        if (currentRecord) {
            processRecord(currentRecord);
        }

    } else {
        // OLD LAYOUT LOGIC
        const lines = text.split('\n');
        
        // Regex patterns
        const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})/;
        // Value: 1.000,00 or 100,00 (ends with ,XX). Matches optional R$ and whitespace.
        // Also captures optional negative sign
        const valueRegex = /(?:R\$\s*)?(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})/;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Try to find date
            const dateMatch = trimmedLine.match(dateRegex);
            if (!dateMatch) {
                if (trimmedLine.length > 10) {
                        ignoredLines.push({
                            line: trimmedLine,
                            reason: 'Data não encontrada',
                            date: null,
                            value: null
                        });
                }
                continue; 
            }

            const dateStr = dateMatch[0]; // DD/MM/YYYY
            const [day, month, year] = dateStr.split('/');
            const isoDate = `${year}-${month}-${day}`;

            // Try to find value
            const valueMatch = trimmedLine.match(valueRegex);
            
            if (!valueMatch) {
                ignoredLines.push({
                        line: trimmedLine,
                        reason: 'Valor não encontrado',
                        date: isoDate,
                        value: null
                });
                continue;
            }

            const valueStr = valueMatch[1];
            // Parse value: remove dots, replace comma with dot, remove spaces and R$
            const cleanValueStr = valueStr.replace(/\./g, '').replace(',', '.').replace(/\s/g, '');
            const valueNum = Math.abs(parseFloat(cleanValueStr));

            // Extract Description
            let description = trimmedLine.replace(dateStr, '').replace(valueMatch[0], '').trim();
            description = description.replace(/\s+/g, ' ').replace('R$', '').trim();
            
            // Remove leading/trailing non-alphanumeric if any (like - or :)
            description = description.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');

            if (!description) {
                    ignoredLines.push({
                        line: trimmedLine,
                        reason: 'Descrição vazia',
                        date: isoDate,
                        value: valueNum
                    });
                    continue;
            }

            const normalizedDesc = description.toUpperCase();
            
            // Try to match category
            let categoryId = null;

            for (const cat of categories) {
                    const catDesc = cat.description.trim().toUpperCase();
                    if (normalizedDesc.includes(catDesc)) {
                        categoryId = cat.id;
                        break;
                    }
                    if (catDesc === normalizedDesc) {
                        categoryId = cat.id;
                        break;
                    }
            }

            if (categoryId) {
                transactionsToInsert.push({
                    id: uuidv4(),
                    company_id: targetCompanyId,
                    category_id: categoryId,
                    date: isoDate,
                    description: description,
                    original_description: description,
                    value: valueNum
                });
            } else {
                ignoredLines.push({
                        line: trimmedLine,
                        reason: 'Categoria não identificada',
                        date: isoDate,
                        value: valueNum
                });
            }
        }
    }

    if (transactionsToInsert.length > 0) {
        // Do not insert yet, return for preview
        // We need to enrich with category names for the UI
        for (const t of transactionsToInsert) {
                const cat = categories.find(c => c.id === t.category_id);
                if (cat) {
                    t.categoryName = cat.description;
                }
                const acc = accounts.find(a => a.id === t.account_id);
                if (acc) {
                    t.accountName = acc.description;
                }
        }
    }

    return { 
        success: transactionsToInsert, 
        ignored: ignoredLines 
    };

  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    console.error('Error stack:', error.stack);
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
    const insertMany = db.transaction(async (txs: any[]) => {
        const stmt = db.prepare(`
            INSERT INTO enuves_transactions (id, company_id, category_id, account_id, date, description, original_description, value)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const t of txs) {
            // Ensure we have a new ID if not provided (though parse generates it)
            const id = t.id || uuidv4();
            await stmt.run(id, targetCompanyId, t.category_id, t.account_id || null, t.date, t.description, t.original_description || t.description, t.value);
        }
    });

    await insertMany(transactions);
    
    revalidatePath('/admin/integrations/enuves');
    return { success: true };
  } catch (error) {
    console.error('Error saving transactions:', error);
    return { error: 'Erro ao salvar lançamentos' };
  }
}
