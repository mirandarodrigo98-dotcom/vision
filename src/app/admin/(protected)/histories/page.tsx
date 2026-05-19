import db from '@/lib/db';
import { format } from 'date-fns';
import { getSession } from '@/lib/auth';
import { getUserPermissions } from '@/app/actions/permissions';
import { redirect } from 'next/navigation';
import { ensureEmployeeHistoriesTable } from '@/lib/employee-histories-db';
import { getEmployeeHistoryStatusLabel, getEmployeeHistoryTypeConfig } from '@/lib/employee-histories';
import { HistoryActions } from '@/components/histories/history-actions';
import { HistoryFilters } from '@/components/histories/history-filters';
import { ColumnHeader } from '@/components/ui/column-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

interface AdminHistoriesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminHistoriesPage({ searchParams }: AdminHistoriesPageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  let hasViewPermission = false;
  const isAdmin = session.role === 'admin' || session.role === 'operator';

  if (isAdmin) {
    hasViewPermission = true;
  } else {
    const permissions = await getUserPermissions();
    hasViewPermission = permissions.includes('histories.view');
  }

  if (!hasViewPermission) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Você não tem permissão para visualizar históricos.</p>
      </div>
    );
  }

  await ensureEmployeeHistoriesTable();

  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  const name = typeof resolvedSearchParams.name === 'string' ? resolvedSearchParams.name : '';
  const company = typeof resolvedSearchParams.company === 'string' ? resolvedSearchParams.company : '';
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : '';
  const requestType = typeof resolvedSearchParams.request_type === 'string' ? resolvedSearchParams.request_type : '';
  const startDate = typeof resolvedSearchParams.start_date === 'string' ? resolvedSearchParams.start_date : '';
  const endDate = typeof resolvedSearchParams.end_date === 'string' ? resolvedSearchParams.end_date : '';
  const effectiveDate = typeof resolvedSearchParams.effective_date === 'string' ? resolvedSearchParams.effective_date : '';

  const allowedSorts = ['protocol_number', 'created_at', 'company_name', 'employee_name', 'request_type', 'status', 'effective_date'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = `
    SELECT
      h.*,
      COALESCE(cc.razao_social, cc.nome) AS company_name,
      e.name AS employee_name
    FROM employee_histories h
    JOIN client_companies cc ON cc.id = h.company_id
    JOIN employees e ON e.id = h.employee_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (session.role === 'client_user') {
    query += ` AND h.company_id IN (SELECT company_id FROM user_companies WHERE user_id = $${params.length + 1})`;
    params.push(session.user_id);
  } else if (session.role === 'operator') {
    query += ` AND (h.company_id IS NULL OR h.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $${params.length + 1}))`;
    params.push(session.user_id);
  }

  if (name) {
    query += ` AND e.name ILIKE $${params.length + 1}`;
    params.push(`%${name}%`);
  }

  if (company && company.length >= 3) {
    query += ` AND (cc.razao_social ILIKE $${params.length + 1} OR cc.nome ILIKE $${params.length + 2})`;
    params.push(`%${company}%`, `%${company}%`);
  }

  if (status && status !== 'all') {
    query += ` AND h.status = $${params.length + 1}`;
    params.push(status);
  }

  if (requestType && requestType !== 'all') {
    query += ` AND h.request_type = $${params.length + 1}`;
    params.push(requestType);
  }

  if (startDate) {
    query += ` AND h.created_at >= $${params.length + 1}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND h.created_at <= $${params.length + 1}`;
    params.push(`${endDate} 23:59:59`);
  }

  if (effectiveDate) {
    query += ` AND h.effective_date = $${params.length + 1}`;
    params.push(effectiveDate);
  }

  const orderBy = safeSort === 'company_name'
    ? 'COALESCE(cc.razao_social, cc.nome)'
    : safeSort === 'employee_name'
      ? 'e.name'
      : `h.${safeSort}`;

  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const histories = (await db.query(query, params)).rows as any[];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Históricos</h2>
      </div>

      <HistoryFilters />

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
                <ColumnHeader column="request_type" title="Tipo" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="effective_date" title="Data Informada" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="status" title="Status" />
              </TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {histories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma solicitação de histórico encontrada.
                </TableCell>
              </TableRow>
            ) : (
              histories.map((history) => {
                const typeConfig = getEmployeeHistoryTypeConfig(history.request_type);
                return (
                  <TableRow key={history.id}>
                    <TableCell className="font-mono text-xs">{history.protocol_number}</TableCell>
                    <TableCell>{history.created_at ? format(new Date(history.created_at), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                    <TableCell>{history.company_name}</TableCell>
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
                        isAdmin
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
