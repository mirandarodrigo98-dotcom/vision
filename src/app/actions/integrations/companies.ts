'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function searchEnuvesCompanies(query: string) {
  const session = await getSession();
  if (!session) return [];

  if (!query) return [];

  try {
    let sql = `
      SELECT id, razao_social, nome, cnpj, code 
      FROM client_companies 
      WHERE is_active = 1 
      AND (razao_social ILIKE ? OR nome ILIKE ? OR cnpj LIKE ? OR code LIKE ?)
    `;
    const params: any[] = [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`];

    if (session.role === 'operator') {
      sql += ` AND id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?)`;
      params.push(session.user_id);
    } else if (session.role === 'client_user') {
      sql += ` AND id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
      params.push(session.user_id);
    }

    sql += ` ORDER BY razao_social ASC LIMIT 20`;

    const companies = await db.prepare(sql).all(...params);
    
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
    let sql = `
      SELECT id, razao_social, nome, cnpj, code 
      FROM client_companies 
      WHERE is_active = 1 
      AND (razao_social ILIKE ? OR nome ILIKE ? OR cnpj LIKE ? OR code LIKE ?)
    `;
    const params: any[] = [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`];

    if (session.role === 'operator') {
      sql += ` AND id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?)`;
      params.push(session.user_id);
    } else if (session.role === 'client_user') {
      sql += ` AND id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
      params.push(session.user_id);
    }

    sql += ` ORDER BY razao_social ASC LIMIT 20`;

    const companies = await db.prepare(sql).all(...params);
    
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
    if (session.role === 'client_user') {
      const hasAccess = await db.prepare('SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, id);
      if (!hasAccess) return null;
    } else if (session.role === 'operator') {
      const restricted = await db.prepare('SELECT 1 FROM user_restricted_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, id);
      if (restricted) return null;
    }

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
