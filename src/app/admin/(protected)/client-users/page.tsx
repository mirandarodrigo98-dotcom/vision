import db from '@/lib/db';
import { UserList } from './client-components';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface UsersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await getSession();
  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';

  // Whitelist allowed sort columns
  const allowedSorts = ['name', 'email', 'is_active', 'created_at'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = `
    SELECT u.id, u.name, u.email, u.phone, u.cell_phone, u.is_active,
           u.notification_email, u.notification_whatsapp, u.carne_leao_access,
           STRING_AGG(c.id::text, ',') as company_ids,
           STRING_AGG(c.nome, ', ') as company_names
    FROM users u
    LEFT JOIN user_companies uc ON u.id = uc.user_id
    LEFT JOIN client_companies c ON uc.company_id = c.id
    WHERE u.role = 'client_user'
  `;

  const params: any[] = [];

  if (session && session.role === 'operator') {
    query += ` AND NOT EXISTS (
      SELECT 1 
      FROM user_companies sub_uc
      JOIN user_restricted_companies sub_urc ON sub_urc.company_id = sub_uc.company_id
      WHERE sub_uc.user_id = u.id AND sub_urc.user_id = $1
    )`;
    params.push(session.user_id);
  }

  if (q) {
    query += ` AND (u.name ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 2})`;
    const likeQ = `%${q}%`;
    params.push(likeQ, likeQ);
  }

  query += ` GROUP BY u.id ORDER BY u.${safeSort} ${safeOrder}`;

  const users = (await db.query(query, [...params])).rows as any[];

  let companiesQuery = "SELECT id, nome, razao_social FROM client_companies WHERE is_active = 1";
  const companiesParams: any[] = [];

  if (session && session.role === 'operator') {
      companiesQuery += ` AND (id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1))`;
      companiesParams.push(session.user_id);
  }

  companiesQuery += " ORDER BY COALESCE(NULLIF(nome, ''), razao_social)";

  const companies = (await db.query(companiesQuery, [...companiesParams])).rows as any[];
  
  return (
    <div className="space-y-6">
      <UserList users={users} companies={companies} />
    </div>
  );
}
