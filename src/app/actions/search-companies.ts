'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function searchCompanies(query: string) {
  const session = await getSession();
  if (!session) {
    console.log('searchCompanies: No session found');
    return [];
  }

  if (!query) return [];

  console.log('searchCompanies: Searching for', query);

  try {
    let sql = `
      SELECT id, razao_social 
      FROM client_companies 
      WHERE is_active = 1 
      AND (razao_social ILIKE ? OR nome ILIKE ?)
    `;
    const params: any[] = [`%${query}%`, `%${query}%`];

    if (session.role === 'operator') {
      sql += ` AND id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?)`;
      params.push(session.user_id);
    } else if (session.role === 'client_user') {
      sql += ` AND id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
      params.push(session.user_id);
    }

    sql += ` ORDER BY razao_social ASC LIMIT 10`;

    const companies = await db.prepare(sql).all(...params);
    
    console.log('searchCompanies: Found', companies.length, 'companies');
    return companies as { id: string; razao_social: string }[];
  } catch (error) {
    console.error('Failed to search companies:', error);
    return [];
  }
}
