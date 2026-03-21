import db from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ColumnHeader } from '@/components/ui/column-header';
import { DismissalActions } from '@/components/dismissals/dismissal-actions';
import { DismissalFilters } from '@/components/dismissals/dismissal-filters';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';

export const dynamic = 'force-dynamic';

interface AdminDismissalsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminDismissalsPage({ searchParams }: AdminDismissalsPageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  // Check view permission
  let hasViewPermission = false;
  const isManager = session.role === 'admin' || session.role === 'operator';

  if (isManager) {
      hasViewPermission = true;
  } else {
      const permissions = await getUserPermissions();
      hasViewPermission = permissions.includes('dismissals.view'); // Ensure this permission exists
  }

  if (!hasViewPermission) {
      return (
          <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Você não tem permissão para visualizar rescisões.</p>
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
  const dismissalDate = typeof resolvedSearchParams.dismissal_date === 'string' ? resolvedSearchParams.dismissal_date : '';

  // Whitelist allowed sort columns
  const allowedSorts = ['protocol_number', 'created_at', 'company_name', 'employee_name', 'dismissal_date', 'status'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = `
    SELECT 
      d.*,
      cc.nome as company_name,
      e.name as employee_name
    FROM dismissals d
    JOIN client_companies cc ON d.company_id = cc.id
    JOIN employees e ON d.employee_id = e.id
    WHERE 1=1
  `;

  const params: any[] = [];

  // Filter by company permission (if not admin/operator)
  if (session.role === 'client_user') {
    query += ` AND d.company_id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
    params.push(session.user_id);
  } else if (session.role === 'operator') {
    query += ` AND (d.company_id IS NULL OR d.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?))`;
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
    query += ` AND d.status = ?`;
    params.push(status);
  }

  if (startDate) {
    query += ` AND d.created_at >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND d.created_at <= ?`;
    params.push(endDate + ' 23:59:59');
  }

  if (dismissalDate) {
    query += ` AND d.dismissal_date LIKE ?`;
    params.push(dismissalDate + '%');
  }

  const orderBy = safeSort === 'company_name' ? 'cc.nome' : 
                  safeSort === 'employee_name' ? 'e.name' :
                  `d.${safeSort}`;
                  
  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const dismissalsData = await db.prepare(query).all(...params) as any[];

  // Serialize dates to avoid Server Components render error
  const dismissals = dismissalsData.map(dismissal => ({
    ...dismissal,
    dismissal_date: dismissal.dismissal_date ? new Date(dismissal.dismissal_date).toISOString() : null,
    created_at: dismissal.created_at ? new Date(dismissal.created_at).toISOString() : null,
    updated_at: dismissal.updated_at ? new Date(dismissal.updated_at).toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Rescisões</h2>
      </div>

      <DismissalFilters />

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
                <ColumnHeader column="dismissal_date" title="Desligamento" />
              </TableHead>
              <TableHead>Tipo Aviso</TableHead>
              <TableHead>
                <ColumnHeader column="status" title="Status" />
              </TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dismissals.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                        Nenhuma solicitação de rescisão encontrada.
                    </TableCell>
                </TableRow>
            ) : (
                dismissals.map((dismissal) => {
                let formattedCreatedAt = '-';
                let formattedDismissalDate = '-';
                
                try {
                    if (dismissal.created_at) formattedCreatedAt = format(new Date(dismissal.created_at), 'dd/MM/yyyy');
                    if (dismissal.dismissal_date) formattedDismissalDate = format(new Date(dismissal.dismissal_date), 'dd/MM/yyyy');
                } catch (e) {
                    console.error('Date formatting error', e);
                }

                return (
                <TableRow key={dismissal.id}>
                    <TableCell className="font-mono text-xs">{dismissal.protocol_number}</TableCell>
                    <TableCell>{formattedCreatedAt}</TableCell>
                    <TableCell>{dismissal.company_name}</TableCell>
                    <TableCell>{dismissal.employee_name}</TableCell>
                    <TableCell>{formattedDismissalDate}</TableCell>
                    <TableCell>{dismissal.notice_type}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${dismissal.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${dismissal.status === 'RECTIFIED' ? 'bg-orange-100 text-orange-800' : ''}
                        ${dismissal.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : ''}
                        ${dismissal.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                      `}>
                        {
                          dismissal.status === 'SUBMITTED' ? 'Solicitado' : 
                          dismissal.status === 'RECTIFIED' ? 'Retificado' :
                          dismissal.status === 'COMPLETED' ? 'Concluído' :
                          dismissal.status === 'CANCELLED' ? 'Cancelado' : 
                          dismissal.status
                        }
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                        <DismissalActions 
                            dismissalId={dismissal.id}
                            dismissalDate={dismissal.dismissal_date}
                            status={dismissal.status}
                            employeeName={dismissal.employee_name}
                            isAdmin={isManager}
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
