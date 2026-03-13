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
    // Use lower(name) for case-insensitive sorting and parameter for boolean compatibility
    const categories = await db.prepare('SELECT * FROM ticket_categories WHERE active = ? ORDER BY lower(name)').all(true);
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
    const id = uuidv4(); // Use standard UUID
    // Use explicit active field to ensure compatibility
    await db.prepare('INSERT INTO ticket_categories (id, name, active) VALUES (?, ?, ?)').run(id, name, true);
    
    revalidatePath('/admin/tickets');
    return { success: true, category: { id, name } };
  } catch (error) {
    console.error('Error creating category:', error);
    // Check for unique constraint (SQLite and Postgres)
    const errorMsg = String(error);
    if (errorMsg.includes('UNIQUE constraint failed') || errorMsg.includes('duplicate key')) {
      return { error: 'Categoria já existe' };
    }
    
    // Return detailed error for debugging in production
    return { error: `Erro ao criar categoria: ${error instanceof Error ? error.message : errorMsg}` };
  }
}
