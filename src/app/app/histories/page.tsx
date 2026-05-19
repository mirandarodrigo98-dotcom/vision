import db from '@/lib/db';
import Link from 'next/link';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserPermissions } from '@/app/actions/permissions';
import { ensureEmployeeHistoriesTable } from '@/lib/employee-histories-db';
import { getEmployeeHistoryStatusLabel, getEmployeeHistoryTypeConfig } from '@/lib/employee-histories';
import { HistoryActions } from '@/components/histories/history-actions';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const dynamic = 'force-dynamic';

interface ClientHistoriesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ClientHistoriesPage({ searchParams }: ClientHistoriesPageProps) {
  const session = await getSession();
  if (!session || session.role !== 'client_user') redirect('/login');

  const permissions = await getUserPermissions();
  const canView = permissions.includes('histories.view');
  const canCreate = permissions.includes('histories.create');

  if (!canView) {
    redirect('/app');
  }

  const activeCompanyId = session.active_company_id;
  if (!activeCompanyId) {
    return <div className="p-8 text-center text-muted-foreground">Selecione uma empresa.</div>;
  }

  await ensureEmployeeHistoriesTable();

  const resolvedSearchParams = await searchParams;
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  const allowedSorts = ['protocol_number', 'created_at', 'employee_name', 'request_type', 'status'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = `
    SELECT
      h.*,
      e.name AS employee_name
    FROM employee_histories h
    JOIN employees e ON e.id = h.employee_id
    WHERE h.company_id = $1
  `;
  const params: any[] = [activeCompanyId];

  if (q) {
    const like = `%${q}%`;
    query += ` AND (h.protocol_number ILIKE $2 OR e.name ILIKE $3 OR h.request_type ILIKE $4)`;
    params.push(like, like, like);
  }

  const orderBy = safeSort === 'employee_name' ? 'e.name' : `h.${safeSort}`;
  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const histories = (await db.query(query, params)).rows as any[];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Históricos</h1>
        {canCreate ? (
          <Link href="/app/histories/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Solicitação
            </Button>
          </Link>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div tabIndex={0}>
                  <Button disabled>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Solicitação
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para criar solicitações de históricos.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="flex items-center justify-between">
        <SearchInput placeholder="Buscar por protocolo, funcionário ou tipo..." />
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocolo</TableHead>
              <TableHead>Data Solicitação</TableHead>
              <TableHead>Funcionário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data Informada</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {histories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Nenhuma solicitação de histórico encontrada.
                </TableCell>
              </TableRow>
            ) : (
              histories.map((history) => {
                const typeConfig = getEmployeeHistoryTypeConfig(history.request_type);
                return (
                  <TableRow key={history.id}>
                    <TableCell className="font-mono text-xs">{history.protocol_number}</TableCell>
                    <TableCell>{history.created_at ? format(new Date(history.created_at), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell>{history.employee_name}</TableCell>
                    <TableCell>{typeConfig.label}</TableCell>
                    <TableCell>{history.effective_date ? format(new Date(history.effective_date), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${history.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${history.status === 'RECTIFIED' ? 'bg-orange-100 text-orange-800' : ''}
                        ${history.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : ''}
                        ${history.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                      `}>
                        {getEmployeeHistoryStatusLabel(history.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <HistoryActions
                        historyId={history.id}
                        status={history.status}
                        employeeName={history.employee_name}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
