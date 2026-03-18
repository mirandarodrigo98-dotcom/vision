import db from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ColumnHeader } from '@/components/ui/column-header';
import { VacationActions } from '@/components/vacations/vacation-actions';
import { VacationFilters } from '@/components/vacations/vacation-filters';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';

export const dynamic = 'force-dynamic';

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
      const permissions = await getUserPermissions();
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
  
  // Filter params
  const name = typeof resolvedSearchParams.name === 'string' ? resolvedSearchParams.name : '';
  const company = typeof resolvedSearchParams.company === 'string' ? resolvedSearchParams.company : '';
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : '';
  const startDate = typeof resolvedSearchParams.start_date === 'string' ? resolvedSearchParams.start_date : '';
  const endDate = typeof resolvedSearchParams.end_date === 'string' ? resolvedSearchParams.end_date : '';
  const vacationDate = typeof resolvedSearchParams.vacation_date === 'string' ? resolvedSearchParams.vacation_date : '';

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
  } else if (session.role === 'operator') {
    query += ` AND (v.company_id IS NULL OR v.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?))`;
    params.push(session.user_id);
  }

  if (name) {
    query += ` AND e.name LIKE ?`;
    params.push(`%${name}%`);
  }

  if (company && company.length >= 3) {
    query += ` AND (cc.razao_social LIKE ? OR cc.nome LIKE ?)`;
    params.push(`%${company}%`, `%${company}%`);
  }

  if (status && status !== 'all') {
    query += ` AND v.status = ?`;
    params.push(status);
  }

  if (startDate) {
    query += ` AND date(v.created_at) >= date(?)`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND date(v.created_at) <= date(?)`;
    params.push(endDate);
  }

  if (vacationDate) {
    query += ` AND date(v.start_date) = date(?)`;
    params.push(vacationDate);
  }

  const orderBy = safeSort === 'company_name' ? 'cc.nome' : 
                  safeSort === 'employee_name' ? 'e.name' :
                  `v.${safeSort}`;
                  
  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const vacationsData = await db.prepare(query).all(...params) as any[];

  // Serialize dates to avoid Server Components render error
  const vacations = vacationsData.map(vacation => ({
    ...vacation,
    start_date: vacation.start_date ? new Date(vacation.start_date).toISOString() : null,
    return_date: vacation.return_date ? new Date(vacation.return_date).toISOString() : null,
    created_at: vacation.created_at ? new Date(vacation.created_at).toISOString() : null,
    updated_at: vacation.updated_at ? new Date(vacation.updated_at).toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Férias</h2>
      </div>

      <VacationFilters />

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
                        ${vacation.status === 'RECTIFIED' ? 'bg-orange-100 text-orange-800' : ''}
                        ${vacation.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : ''}
                        ${vacation.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                      `}>
                        {
                          vacation.status === 'SUBMITTED' ? 'Solicitado' : 
                          vacation.status === 'RECTIFIED' ? 'Retificado' :
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
