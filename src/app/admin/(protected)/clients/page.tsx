import db from '@/lib/db';
import { CompanyList } from './client-components';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { CompanyImportDialog } from '@/components/admin/companies/company-import-dialog';
import { QuestorCompanyImport } from '@/components/admin/companies/questor-company-import';
import { ClientsStatusFilter } from './clients-status-filter';
import { getUserPermissions } from '@/app/actions/permissions';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface ClientsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const session = await getSession();
  const permissions = await getUserPermissions();
  if (!permissions.includes('clients.view')) {
    redirect('/admin/dashboard');
  }

  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'razao_social';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'asc';
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : 'all';

  // Whitelist allowed sort columns
  const allowedSorts = ['code', 'nome', 'razao_social', 'cnpj', 'email_contato', 'is_active', 'created_at'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'razao_social';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = `
    SELECT c.*, 
    (
      EXISTS(SELECT 1 FROM employees e WHERE e.company_id = c.id) OR
      EXISTS(SELECT 1 FROM admission_requests a WHERE a.company_id = c.id) OR
      EXISTS(SELECT 1 FROM transfer_requests t WHERE t.source_company_id = c.id OR t.target_company_id = c.id) OR
      EXISTS(SELECT 1 FROM user_companies u WHERE u.company_id = c.id)
    ) as has_movements
    FROM client_companies c
    WHERE 1=1
  `;
  const params: any[] = [];

  if (session) {
    if (session.role === 'client_user') {
      query += ` AND c.id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
      params.push(session.user_id);
    } else if (session.role === 'operator') {
      query += ` AND c.id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?)`;
      params.push(session.user_id);
    }
  }

  if (q) {
    query += ' AND (c.nome LIKE ? OR c.razao_social LIKE ? OR c.cnpj LIKE ? OR c.email_contato LIKE ? OR c.code LIKE ?)';
    const likeQ = `%${q}%`;
    params.push(likeQ, likeQ, likeQ, likeQ, likeQ);
  }

  if (status === 'active') {
    query += ' AND c.is_active = 1';
  } else if (status === 'inactive') {
    query += ' AND c.is_active = 0';
  }

  // Use CAST to sort numerically if sorting by code
  const orderBy = safeSort === 'code' ? 'CAST(code AS INTEGER)' : safeSort;

  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const companies = await db.prepare(query).all(...params) as any[];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Empresas</h2>
        <div className="flex gap-2">
          <CompanyImportDialog />
          <QuestorCompanyImport />
          <Link href="/admin/clients/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova Empresa
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <SearchInput placeholder="Buscar por nome, CNPJ, email ou código..." />
        <ClientsStatusFilter />
      </div>

      <CompanyList companies={companies} />
    </div>
  );
}
