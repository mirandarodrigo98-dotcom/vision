'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const accountantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  type: z.enum(['PF', 'PJ']),
  document: z.string().optional(),
  crc_number: z.string().optional(),
  crc_uf: z.string().optional(),
  crc_sequence: z.string().optional(),
  crc_date: z.string().optional(), // YYYY-MM-DD
  qualification: z.string().optional(),
  zip_code: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  cellphone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

export async function getAccountants() {
  const session = await getSession();
  if (!session) return [];
  
  try {
    const accountants = db.prepare('SELECT * FROM accountants ORDER BY name ASC').all();
    return accountants;
  } catch (error) {
    console.error('Error fetching accountants:', error);
    return [];
  }
}

export async function getAccountant(id: string) {
  const session = await getSession();
  if (!session) return null;
  
  try {
    const accountant = db.prepare('SELECT * FROM accountants WHERE id = ?').get(id);
    return accountant;
  } catch (error) {
    console.error('Error fetching accountant:', error);
    return null;
  }
}

export async function createAccountant(data: z.infer<typeof accountantSchema>) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };
  
  // TODO: Check permissions
  
  try {
    const result = accountantSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.issues[0].message };
    }
    
    const { 
      name, type, document, crc_number, crc_uf, crc_sequence, crc_date, 
      qualification, zip_code, address, number, complement, neighborhood, 
      city, state, phone, fax, cellphone, email 
    } = result.data;
    
    db.prepare(`
      INSERT INTO accountants (
        name, type, document, crc_number, crc_uf, crc_sequence, crc_date,
        qualification, zip_code, address, number, complement, neighborhood,
        city, state, phone, fax, cellphone, email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, type, document, crc_number, crc_uf, crc_sequence, crc_date || null,
      qualification, zip_code, address, number, complement, neighborhood,
      city, state, phone, fax, cellphone, email
    );
    
    revalidatePath('/admin/accountants');
    return { success: true };
  } catch (error) {
    console.error('Error creating accountant:', error);
    return { error: 'Failed to create accountant' };
  }
}

export async function updateAccountant(id: string, data: z.infer<typeof accountantSchema>) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };
  
  try {
    const result = accountantSchema.safeParse(data);
    if (!result.success) {
      return { error: result.error.issues[0].message };
    }
    
    const { 
      name, type, document, crc_number, crc_uf, crc_sequence, crc_date, 
      qualification, zip_code, address, number, complement, neighborhood, 
      city, state, phone, fax, cellphone, email 
    } = result.data;
    
    db.prepare(`
      UPDATE accountants SET
        name = ?, type = ?, document = ?, crc_number = ?, crc_uf = ?, 
        crc_sequence = ?, crc_date = ?, qualification = ?, zip_code = ?, 
        address = ?, number = ?, complement = ?, neighborhood = ?, 
        city = ?, state = ?, phone = ?, fax = ?, cellphone = ?, email = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, type, document, crc_number, crc_uf, crc_sequence, crc_date || null,
      qualification, zip_code, address, number, complement, neighborhood,
      city, state, phone, fax, cellphone, email,
      id
    );
    
    revalidatePath('/admin/accountants');
    return { success: true };
  } catch (error) {
    console.error('Error updating accountant:', error);
    return { error: 'Failed to update accountant' };
  }
}

export async function deleteAccountant(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };
  
  try {
    // Soft delete
    db.prepare('UPDATE accountants SET is_active = false WHERE id = ?').run(id);
    revalidatePath('/admin/accountants');
    return { success: true };
  } catch (error) {
    console.error('Error deleting accountant:', error);
    return { error: 'Failed to delete accountant' };
  }
}
