'use server';

import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function searchCompanies(query: string) {
  const session = await getSession();
  if (!session) return [];

  if (!query || query.length < 3) return [];

  try {
    const companies = await db.prepare(`
      SELECT id, razao_social 
      FROM client_companies 
      WHERE is_active = 1 
      AND (razao_social ILIKE ? OR nome ILIKE ?)
      ORDER BY razao_social ASC
      LIMIT 10
    `).all(`%${query}%`, `%${query}%`);
    return companies as { id: string; razao_social: string }[];
  } catch (error) {
    console.error('Failed to search companies:', error);
    return [];
  }
}
