import db from '@/lib/db';
import { UserList } from './client-components';

interface UsersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';

  // Whitelist allowed sort columns
  const allowedSorts = ['name', 'email', 'is_active', 'created_at'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = `
    SELECT u.id, u.name, u.email, u.phone, u.is_active, 
           GROUP_CONCAT(c.id) as company_ids,
           GROUP_CONCAT(c.nome, ', ') as company_names
    FROM users u
    LEFT JOIN user_companies uc ON u.id = uc.user_id
    LEFT JOIN client_companies c ON uc.company_id = c.id
    WHERE u.role = 'client_user'
  `;

  const params: any[] = [];

  if (q) {
    query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
    const likeQ = `%${q}%`;
    params.push(likeQ, likeQ);
  }

  query += ` GROUP BY u.id ORDER BY u.${safeSort} ${safeOrder}`;

  const users = await db.prepare(query).all(...params) as any[];

  const companies = await db.prepare('SELECT id, nome FROM client_companies WHERE is_active = 1 ORDER BY nome').all() as any[];

  return (
    <div className="space-y-6">
      <UserList users={users} companies={companies} />
    </div>
  );
}
