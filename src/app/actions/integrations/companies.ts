'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function searchEnuvesCompanies(query: string) {
  const session = await getSession();
  if (!session) return [];

  if (!query) return [];

  try {
    const companies = await db.prepare(`
      SELECT id, razao_social, nome, cnpj, code 
      FROM client_companies 
      WHERE is_active = 1 
      AND (razao_social ILIKE ? OR nome ILIKE ? OR cnpj ILIKE ? OR code ILIKE ?)
      ORDER BY razao_social ASC
      LIMIT 20
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
    
    return companies as { 
      id: string; 
      razao_social: string; 
      nome: string; 
      cnpj: string;
      code: string;
    }[];
  } catch (error) {
    console.error('Failed to search companies:', error);
    return [];
  }
}

export async function searchEklesiaCompanies(query: string) {
  const session = await getSession();
  if (!session) return [];

  if (!query) return [];

  try {
    const companies = await db.prepare(`
      SELECT id, razao_social, nome, cnpj, code 
      FROM client_companies 
      WHERE is_active = 1 
      AND (razao_social ILIKE ? OR nome ILIKE ? OR cnpj ILIKE ? OR code ILIKE ?)
      ORDER BY razao_social ASC
      LIMIT 20
    `).all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
    
    return companies as { 
      id: string; 
      razao_social: string; 
      nome: string; 
      cnpj: string;
      code: string;
    }[];
  } catch (error) {
    console.error('Failed to search companies:', error);
    return [];
  }
}

export async function getCompanyDetails(id: string) {
  const session = await getSession();
  if (!session) return null;

  try {
    const company = await db.prepare(`
      SELECT id, razao_social, nome, cnpj, code 
      FROM client_companies 
      WHERE id = ?
    `).get(id);
    
    return company as { 
      id: string; 
      razao_social: string; 
      nome: string; 
      cnpj: string;
      code: string;
    } | null;
  } catch (error) {
    console.error('Failed to get company details:', error);
    return null;
  }
}
