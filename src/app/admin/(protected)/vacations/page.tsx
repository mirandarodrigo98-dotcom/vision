import db from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { SearchInput } from '@/components/ui/search-input';
import { ColumnHeader } from '@/components/ui/column-header';
import { VacationActions } from '@/components/vacations/vacation-actions';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getRolePermissions } from '@/app/actions/permissions';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface AdminVacationsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminVacationsPage({ searchParams }: AdminVacationsPageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  // Check view permission
  let hasViewPermission = false;
  let isAdmin = session.role === 'admin' || session.role === 'operator';

  if (isAdmin) {
      hasViewPermission = true;
  } else {
      const permissions = await getRolePermissions(session.role);
      hasViewPermission = permissions.includes('vacations.view');
  }

  if (!hasViewPermission) {
      return (
          <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Você não tem permissão para visualizar férias.</p>
          </div>
      );
  }

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
    WHERE 1=1
  `;

  const params: any[] = [];

  // Filter by company permission (if not admin/operator)
  if (session.role === 'client_user') {
    query += ` AND v.company_id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
    params.push(session.user_id);
  }

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Férias</h2>
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
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${vacation.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${vacation.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ''}
                        ${vacation.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                      `}>
                        {
                          vacation.status === 'SUBMITTED' ? 'Solicitado' : 
                          vacation.status === 'COMPLETED' ? 'Concluído' :
                          vacation.status === 'CANCELLED' ? 'Cancelado' : 
                          vacation.status
                        }
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                        <VacationActions 
                            vacationId={vacation.id}
                            startDate={vacation.start_date}
                            status={vacation.status}
                            employeeName={vacation.employee_name}
                            isAdmin={isAdmin}
                            basePath="/admin"
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
