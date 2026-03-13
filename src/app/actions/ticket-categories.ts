'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { hasPermission } from '@/lib/rbac';

const CategorySchema = z.object({
  name: z.string().min(1, 'Nome da categoria é obrigatório'),
});

export async function getTicketCategories() {
  const session = await getSession();
  if (!session) return [];

  try {
    const categories = await db.prepare('SELECT * FROM ticket_categories WHERE active = 1 ORDER BY name').all();
    return categories as { id: string; name: string; active: number }[];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function createTicketCategory(name: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autenticado' };

  // Check permission
  const canCreate = await hasPermission(session.role, 'tickets.create_category');
  if (session.role !== 'admin' && !canCreate) {
    return { error: 'Sem permissão' };
  }

  const validated = CategorySchema.safeParse({ name });
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  try {
    const id = `cat_${uuidv4().replace(/-/g, '')}`; // Simple ID prefix
    await db.prepare('INSERT INTO ticket_categories (id, name) VALUES (?, ?)').run(id, name);
    
    revalidatePath('/admin/tickets');
    return { success: true, category: { id, name } };
  } catch (error) {
    console.error('Error creating category:', error);
    // Check for unique constraint
    if (String(error).includes('UNIQUE constraint failed')) {
      return { error: 'Categoria já existe' };
    }
    return { error: 'Erro ao criar categoria' };
  }
}
