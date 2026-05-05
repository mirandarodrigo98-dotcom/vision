'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function findSocioByCpf(cpf: string) {
  const session = await getSession();
  if (!session) return null;
  try {
    const digits = String(cpf || '').replace(/\D/g, '');
    const socio = (await db.query(`SELECT * FROM societario_socios WHERE cpf = $1`, [digits])).rows[0];
    return socio || null;
  } catch {
    return null;
  }
}

export async function searchSocios(term: string) {
  const session = await getSession();
  if (!session) return [];
  try {
    const cleanTerm = term.trim();
    if (!cleanTerm) return [];
    
    // Check if it's CPF (digits only)
    const digitsOnly = cleanTerm.replace(/\D/g, '');
    if (digitsOnly.length > 3) {
       const socios = (await db.query(`SELECT * FROM societario_socios WHERE cpf LIKE $1 LIMIT 10`, [`%${digitsOnly}%`])).rows;
       return socios as any[];
    }

    // Search by name
    const socios = (await db.query(`SELECT * FROM societario_socios WHERE LOWER(nome) LIKE LOWER($1) LIMIT 10`, [`%${cleanTerm}%`])).rows;
    return socios as any[];
  } catch (err) {
    console.error('Error searching socios:', err);
    return [];
  }
}
