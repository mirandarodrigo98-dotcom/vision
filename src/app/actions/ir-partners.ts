'use server'

import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export type IRPartner = {
  id: string;
  name: string;
  commission_percent: number;
  email: string | null;
  phone: string | null;
  payment_data: string | null;
  created_at: string;
  updated_at: string;
};

export async function getIRPartners() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }

  const partners = (await db.query(`
    SELECT * FROM ir_partners ORDER BY name ASC
  `, [])).rows as IRPartner[];

  return partners;
}

export async function createIRPartner(data: Omit<IRPartner, 'id' | 'created_at' | 'updated_at'>) {
  const session = await getSession();
  if (!session) {
    return { error: 'Não autorizado' };
  }

  const id = uuidv4();
  
  try {
    await db.query(`
      INSERT INTO ir_partners (id, name, commission_percent, email, phone, payment_data)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [id, data.name, data.commission_percent, data.email || null, data.phone || null, data.payment_data || null]);

    revalidatePath('/admin/pessoa-fisica/imposto-renda');
    return { success: true, id };
  } catch (error) {
    console.error(error);
    return { error: 'Erro ao criar parceiro.' };
  }
}

export async function updateIRPartner(id: string, data: Omit<IRPartner, 'id' | 'created_at' | 'updated_at'>) {
  const session = await getSession();
  if (!session) {
    return { error: 'Não autorizado' };
  }

  try {
    await db.query(`
      UPDATE ir_partners 
      SET name = $1, commission_percent = $2, email = $3, phone = $4, payment_data = $5, updated_at = NOW()
      WHERE id = $6
    `, [data.name, data.commission_percent, data.email || null, data.phone || null, data.payment_data || null, id]);

    revalidatePath('/admin/pessoa-fisica/imposto-renda');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: 'Erro ao atualizar parceiro.' };
  }
}

export async function deleteIRPartner(id: string) {
  const session = await getSession();
  if (!session) {
    return { error: 'Não autorizado' };
  }

  try {
    // Check if it's used in declarations
    const used = (await db.query(`SELECT id FROM ir_declarations WHERE indicated_by_partner_id = $1 LIMIT 1`, [id])).rows[0];
    if (used) {
        return { error: 'Não é possível excluir este parceiro pois ele está vinculado a uma ou mais declarações.' };
    }

    await db.query(`DELETE FROM ir_partners WHERE id = $1`, [id]);
    revalidatePath('/admin/pessoa-fisica/imposto-renda');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: 'Erro ao excluir parceiro.' };
  }
}
