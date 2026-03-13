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

export async function getTicketCategories(includeInactive = false) {
  const session = await getSession();
  if (!session) return [];

  try {
    let sql = 'SELECT * FROM ticket_categories';
    const params: any[] = [];
    
    if (!includeInactive) {
      sql += ' WHERE active = ?';
      params.push(true);
    }
    
    sql += ' ORDER BY lower(name)';
    
    const categories = await db.prepare(sql).all(...params);
    return categories as { id: string; name: string; active: number }[];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function getAdminTicketCategories(search?: string) {
  const session = await getSession();
  if (!session) return [];
  
  const canManage = await hasPermission(session.role, 'tickets.manage_categories');
  if (session.role !== 'admin' && !canManage) {
    return [];
  }

  try {
    let sql = 'SELECT * FROM ticket_categories';
    const params: any[] = [];
    
    if (search) {
      sql += ' WHERE lower(name) LIKE ?';
      params.push(`%${search.toLowerCase()}%`);
    }
    
    sql += ' ORDER BY lower(name)';
    
    const categories = await db.prepare(sql).all(...params);
    return categories as { id: string; name: string; active: number }[];
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    return [];
  }
}

export async function updateTicketCategory(id: string, data: { name?: string; active?: boolean }) {
  const session = await getSession();
  if (!session) return { error: 'Não autenticado' };

  const canManage = await hasPermission(session.role, 'tickets.manage_categories');
  if (session.role !== 'admin' && !canManage) {
    return { error: 'Sem permissão' };
  }

  try {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }

    if (data.active !== undefined) {
      updates.push('active = ?');
      params.push(data.active);
    }

    if (updates.length === 0) return { success: true };

    params.push(id);
    
    await db.prepare(`UPDATE ticket_categories SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    
    revalidatePath('/admin/tickets');
    return { success: true };
  } catch (error) {
    console.error('Error updating category:', error);
    const errorMsg = String(error);
    if (errorMsg.includes('UNIQUE constraint failed') || errorMsg.includes('duplicate key')) {
      return { error: 'Nome de categoria já existe' };
    }
    return { error: 'Erro ao atualizar categoria' };
  }
}

export async function deleteTicketCategory(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Não autenticado' };

  const canManage = await hasPermission(session.role, 'tickets.manage_categories');
  if (session.role !== 'admin' && !canManage) {
    return { error: 'Sem permissão' };
  }

  try {
    // Check for usage in tickets
    const usageCount = await db.prepare('SELECT COUNT(*) as count FROM tickets WHERE category = (SELECT name FROM ticket_categories WHERE id = ?)').get(id) as { count: number };
    
    if (usageCount && usageCount.count > 0) {
      return { error: 'Não é possível excluir: existem chamados vinculados a esta categoria.' };
    }

    await db.prepare('DELETE FROM ticket_categories WHERE id = ?').run(id);
    
    revalidatePath('/admin/tickets');
    return { success: true };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { error: 'Erro ao excluir categoria' };
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
