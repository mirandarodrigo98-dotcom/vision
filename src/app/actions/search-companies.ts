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
    const companies = await db.prepare(`
      SELECT id, razao_social 
      FROM client_companies 
      WHERE is_active = 1 
      AND (razao_social ILIKE ? OR nome ILIKE ?)
      ORDER BY razao_social ASC
      LIMIT 10
    `).all(`%${query}%`, `%${query}%`);
    
    console.log('searchCompanies: Found', companies.length, 'companies');
    return companies as { id: string; razao_social: string }[];
  } catch (error) {
    console.error('Failed to search companies:', error);
    return [];
  }
}
