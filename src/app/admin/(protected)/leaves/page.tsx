import db from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ColumnHeader } from '@/components/ui/column-header';
import { LeaveActions } from '@/components/leaves/leave-actions';
import { LeaveFilters } from '@/components/leaves/leave-filters';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface AdminLeavesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminLeavesPage({ searchParams }: AdminLeavesPageProps) {
  const session = await getSession();
  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  
  // Filters
  const name = typeof resolvedSearchParams.name === 'string' ? resolvedSearchParams.name : '';
  const company = typeof resolvedSearchParams.company === 'string' ? resolvedSearchParams.company : '';
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : '';
  const startDate = typeof resolvedSearchParams.start_date === 'string' ? resolvedSearchParams.start_date : '';
  const endDate = typeof resolvedSearchParams.end_date === 'string' ? resolvedSearchParams.end_date : '';
  const leaveDate = typeof resolvedSearchParams.leave_date === 'string' ? resolvedSearchParams.leave_date : '';

  const allowedSorts = ['protocol_number', 'created_at', 'company_name', 'employee_name', 'status', 'start_date', 'type'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = \`
    SELECT 
      l.*,
      COALESCE(sc.razao_social, sc.nome) as company_name,
      e.name as employee_name
    FROM leaves l
    JOIN client_companies sc ON l.company_id = sc.id
    JOIN employees e ON l.employee_id = e.id
    WHERE 1=1
  `;

  const params: any[] = [];

  if (session) {
    if (session.role === 'client_user') {
      query += ` AND l.company_id IN (SELECT company_id FROM user_companies WHERE user_id = $${params.length + 1})`;
      params.push(session.user_id);
    } else if (session.role === 'operator') {
      query += ` AND (l.company_id IS NULL OR l.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $${params.length + 1}))`;
      params.push(session.user_id);
    }
  }

  if (name) {
    query += ` AND e.name ILIKE $${params.length + 1}`;
    params.push(`%${name}%`);
  }

  if (company && company.length >= 3) {
    query += ` AND (sc.razao_social ILIKE $${params.length + 1} OR sc.nome ILIKE $${params.length + 2})`;
    params.push(`%${company}%`, `%${company}%`);
  }

  if (status && status !== 'all') {
    query += ` AND l.status = $${params.length + 1}`;
    params.push(status);
  }

  if (startDate) {
    query += ` AND l.created_at >= $${params.length + 1}`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND l.created_at <= $${params.length + 1}`;
    params.push(endDate + ' 23:59:59');
  }

  if (leaveDate) {
    query += ` AND l.start_date::text LIKE $${params.length + 1}`;
    params.push(leaveDate + '%');
  }

  const orderBy = safeSort === 'company_name' ? 'COALESCE(sc.razao_social, sc.nome)' : 
                  safeSort === 'employee_name' ? 'e.name' :
                  `l.${safeSort}`;
                  
  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const leavesData = (await db.query(query, [...params])).rows as any[];

  // Serialize dates to avoid Server Components render error
  const leaves = leavesData.map(leave => ({
    ...leave,
    start_date: leave.start_date ? new Date(leave.start_date).toISOString() : null,
    end_date: leave.end_date ? new Date(leave.end_date).toISOString() : null,
    created_at: leave.created_at ? new Date(leave.created_at).toISOString() : null,
    updated_at: leave.updated_at ? new Date(leave.updated_at).toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Afastamentos</h2>
      </div>

      <LeaveFilters />

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
                <ColumnHeader column="type" title="Tipo" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="start_date" title="Data Início" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="status" title="Status" />
              </TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum afastamento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              leaves.map((leave) => {
                let formattedCreatedAt = 'Data inválida';
                let formattedStartDate = '-';
                try {
                    if (leave.created_at) {
                        formattedCreatedAt = format(new Date(leave.created_at), 'dd/MM/yyyy HH:mm');
                    }
                    if (leave.start_date) {
                         formattedStartDate = format(new Date(leave.start_date), 'dd/MM/yyyy');
                    }
                } catch (e) {
                    console.error('Error formatting date', e);
                }

                return (
                  <TableRow key={leave.id}>
                    <TableCell className="font-mono text-xs">{leave.protocol_number}</TableCell>
                    <TableCell>{formattedCreatedAt}</TableCell>
                    <TableCell>{leave.company_name}</TableCell>
                    <TableCell>{leave.employee_name}</TableCell>
                    <TableCell>{leave.type || leave.leave_type}</TableCell>
                    <TableCell>{formattedStartDate}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${leave.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${leave.status === 'RECTIFIED' ? 'bg-orange-100 text-orange-800' : ''}
                        ${leave.status === 'APPROVED' ? 'bg-primary/10 text-primary' : ''}
                        ${leave.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : ''}
                        ${leave.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                        ${leave.status === 'REJECTED' ? 'bg-red-200 text-red-900' : ''}
                      `}>
                        {
                          leave.status === 'SUBMITTED' ? 'Solicitado' : 
                          leave.status === 'RECTIFIED' ? 'Retificado' :
                          leave.status === 'APPROVED' ? 'Concluído' :
                          leave.status === 'COMPLETED' ? 'Concluído' :
                          leave.status === 'CANCELLED' ? 'Cancelado' : 
                          leave.status === 'REJECTED' ? 'Rejeitado' :
                          leave.status
                        }
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <LeaveActions 
                        leaveId={leave.id} 
                        startDate={leave.start_date}
                        status={leave.status}
                        employeeName={leave.employee_name}
                        isAdmin={true}
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
