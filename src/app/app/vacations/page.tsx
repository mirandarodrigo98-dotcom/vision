import db from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { SearchInput } from '@/components/ui/search-input';
import { ColumnHeader } from '@/components/ui/column-header';
import { VacationActions } from '@/components/vacations/vacation-actions';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { hasPermission } from '@/lib/rbac';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ClientVacationsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ClientVacationsPage({ searchParams }: ClientVacationsPageProps) {
  const session = await getSession();
  if (!session || session.role !== 'client_user') redirect('/login');

  const canCreate = await hasPermission(session.role, 'vacations.create');

  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';

  // Whitelist allowed sort columns
  const allowedSorts = ['protocol_number', 'created_at', 'company_name', 'employee_name', 'start_date', 'status'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = `
    SELECT 
      v.*,
      cc.nome as company_name,
      e.name as employee_name
    FROM vacations v
    JOIN client_companies cc ON v.company_id = cc.id
    JOIN employees e ON v.employee_id = e.id
    WHERE v.company_id IN (SELECT company_id FROM user_companies WHERE user_id = ?)
  `;

  const params: any[] = [session.user_id];

  if (q) {
    query += ` AND (v.protocol_number LIKE ? OR e.name LIKE ? OR cc.nome LIKE ?)`;
    const likeQ = `%${q}%`;
    params.push(likeQ, likeQ, likeQ);
  }

  const orderBy = safeSort === 'company_name' ? 'cc.nome' : 
                  safeSort === 'employee_name' ? 'e.name' :
                  `v.${safeSort}`;
                  
  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const vacations = await db.prepare(query).all(...params) as any[];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="secondary">Solicitado</Badge>;
      case 'COMPLETED':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Concluído</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Férias</h2>
        {canCreate ? (
          <Link href="/app/vacations/new">
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
                <p>Você não tem permissão para criar novas férias.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="flex items-center justify-between">
        <SearchInput placeholder="Buscar por protocolo, funcionário ou empresa..." />
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <ColumnHeader column="protocol_number" title="Protocolo" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="created_at" title="Data Solicitação" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="company_name" title="Empresa" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="employee_name" title="Funcionário" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="start_date" title="Início Férias" />
              </TableHead>
              <TableHead>Dias</TableHead>
              <TableHead>Retorno</TableHead>
              <TableHead>
                <ColumnHeader column="status" title="Status" />
              </TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vacations.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                        Nenhuma solicitação de férias encontrada.
                    </TableCell>
                </TableRow>
            ) : (
                vacations.map((vacation) => {
                let formattedCreatedAt = '-';
                let formattedStartDate = '-';
                let formattedReturnDate = '-';
                
                try {
                    if (vacation.created_at) formattedCreatedAt = format(new Date(vacation.created_at), 'dd/MM/yyyy');
                    if (vacation.start_date) formattedStartDate = format(new Date(vacation.start_date), 'dd/MM/yyyy');
                    if (vacation.return_date) formattedReturnDate = format(new Date(vacation.return_date), 'dd/MM/yyyy');
                } catch (e) {
                    console.error('Date formatting error', e);
                }

                return (
                <TableRow key={vacation.id}>
                    <TableCell className="font-mono text-xs">{vacation.protocol_number}</TableCell>
                    <TableCell>{formattedCreatedAt}</TableCell>
                    <TableCell>{vacation.company_name}</TableCell>
                    <TableCell>{vacation.employee_name}</TableCell>
                    <TableCell>{formattedStartDate}</TableCell>
                    <TableCell>{vacation.days_quantity}</TableCell>
                    <TableCell>{formattedReturnDate}</TableCell>
                    <TableCell>
                        {getStatusBadge(vacation.status)}
                    </TableCell>
                    <TableCell>
                        <VacationActions 
                            vacationId={vacation.id}
                            startDate={vacation.start_date}
                            status={vacation.status}
                            employeeName={vacation.employee_name}
                            isAdmin={false}
                            basePath="/app"
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
