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
    const accountants = (await db.query('SELECT * FROM accountants ORDER BY name ASC', [])).rows;
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
    const accountant = (await db.query(`SELECT * FROM accountants WHERE id = $1`, [id])).rows[0];
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
    
    await db.query(`
      INSERT INTO accountants (
        name, type, document, crc_number, crc_uf, crc_sequence, crc_date,
        qualification, zip_code, address, number, complement, neighborhood,
        city, state, phone, fax, cellphone, email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `, [name, type, document, crc_number, crc_uf, crc_sequence, crc_date || null, qualification, zip_code, address, number, complement, neighborhood, city, state, phone, fax, cellphone, email]);
    
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
    
    await db.query(`
      UPDATE accountants SET
        name = $1, type = $2, document = $3, crc_number = $4, crc_uf = $5, 
        crc_sequence = $6, crc_date = $7, qualification = $8, zip_code = $9, 
        address = $10, number = $11, complement = $12, neighborhood = $13, 
        city = $14, state = $15, phone = $16, fax = $17, cellphone = $18, email = $19,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
    `, [name, type, document, crc_number, crc_uf, crc_sequence, crc_date || null, qualification, zip_code, address, number, complement, neighborhood, city, state, phone, fax, cellphone, email, id]);
    
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
    await db.query(`UPDATE accountants SET is_active = false WHERE id = $1`, [id]);
    revalidatePath('/admin/accountants');
    return { success: true };
  } catch (error) {
    console.error('Error deleting accountant:', error);
    return { error: 'Failed to delete accountant' };
  }
}
