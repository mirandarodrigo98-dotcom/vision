
'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const phoneSchema = z.object({
  company_id: z.string(),
  name: z.string().min(1, 'Nome é obrigatório'),
  category_id: z.number().int(),
  number: z.string().min(1, 'Número é obrigatório'),
  is_whatsapp: z.boolean().optional(),
});

const emailSchema = z.object({
  company_id: z.string(),
  name: z.string().min(1, 'Nome é obrigatório'),
  category_id: z.number().int(),
  email: z.string().email('E-mail inválido'),
});

export async function getContactCategories() {
  try {
    const categories = await db.prepare('SELECT * FROM contact_categories ORDER BY name').all();
    return categories as { id: number; name: string }[];
  } catch (error) {
    console.error('Error fetching contact categories:', error);
    return [];
  }
}

export async function createContactCategory(name: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    await db.prepare('INSERT INTO contact_categories (name) VALUES (?)').run(name);
    return { success: true };
  } catch (error) {
    console.error('Error creating category:', error);
    return { error: 'Erro ao criar categoria.' };
  }
}

export async function getCompanyPhones(companyId: string) {
  try {
    const phones = await db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM company_phones p
      LEFT JOIN contact_categories c ON p.category_id = c.id
      WHERE p.company_id = ?
      ORDER BY p.created_at DESC
    `).all(companyId);
    return phones as any[];
  } catch (error) {
    console.error('Error fetching phones:', error);
    return [];
  }
}

export async function saveCompanyPhone(data: any) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const validation = phoneSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  try {
    await db.prepare(`
      INSERT INTO company_phones (company_id, name, category_id, number, is_whatsapp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      data.company_id,
      data.name,
      data.category_id,
      data.number,
      data.is_whatsapp ? true : false
    );
    revalidatePath('/admin/companies');
    return { success: true };
  } catch (error) {
    console.error('Error saving phone:', error);
    return { error: 'Erro ao salvar telefone.' };
  }
}

export async function deleteCompanyPhone(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    await db.prepare('DELETE FROM company_phones WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting phone:', error);
    return { error: 'Erro ao excluir telefone.' };
  }
}

export async function getCompanyEmails(companyId: string) {
  try {
    const emails = await db.prepare(`
      SELECT e.*, c.name as category_name 
      FROM company_emails e
      LEFT JOIN contact_categories c ON e.category_id = c.id
      WHERE e.company_id = ?
      ORDER BY e.created_at DESC
    `).all(companyId);
    return emails as any[];
  } catch (error) {
    console.error('Error fetching emails:', error);
    return [];
  }
}

export async function saveCompanyEmail(data: any) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const validation = emailSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.errors[0].message };
  }

  try {
    await db.prepare(`
      INSERT INTO company_emails (company_id, name, category_id, email)
      VALUES (?, ?, ?, ?)
    `).run(
      data.company_id,
      data.name,
      data.category_id,
      data.email
    );
    revalidatePath('/admin/companies');
    return { success: true };
  } catch (error) {
    console.error('Error saving email:', error);
    return { error: 'Erro ao salvar e-mail.' };
  }
}

export async function deleteCompanyEmail(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    await db.prepare('DELETE FROM company_emails WHERE id = ?').run(id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting email:', error);
    return { error: 'Erro ao excluir e-mail.' };
  }
}
