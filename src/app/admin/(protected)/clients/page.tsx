import db from '@/lib/db';
import { CompanyList } from './client-components';
import { SearchInput } from '@/components/ui/search-input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { CompanyImportDialog } from '@/components/admin/companies/company-import-dialog';

interface ClientsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'nome';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'asc';
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';

  // Whitelist allowed sort columns
  const allowedSorts = ['code', 'nome', 'cnpj', 'email_contato', 'is_active', 'created_at'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'nome';
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
  `;
  const params: any[] = [];

  if (q) {
    query += ' WHERE (c.nome LIKE ? OR c.cnpj LIKE ? OR c.email_contato LIKE ? OR c.code LIKE ?)';
    const likeQ = `%${q}%`;
    params.push(likeQ, likeQ, likeQ, likeQ);
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
          <Link href="/admin/clients/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova Empresa
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome, CNPJ, email ou código..." />
      </div>

      <CompanyList companies={companies} />
    </div>
  );
}
