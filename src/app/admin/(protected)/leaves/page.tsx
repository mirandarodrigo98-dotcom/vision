import db from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { SearchInput } from '@/components/ui/search-input';
import { ColumnHeader } from '@/components/ui/column-header';
import { LeaveActions } from '@/components/leaves/leave-actions';

interface AdminLeavesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminLeavesPage({ searchParams }: AdminLeavesPageProps) {
  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';

  const allowedSorts = ['protocol_number', 'created_at', 'company_name', 'employee_name', 'status', 'start_date', 'type'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = `
    SELECT 
      l.*,
      sc.nome as company_name,
      e.name as employee_name
    FROM leaves l
    JOIN client_companies sc ON l.company_id = sc.id
    JOIN employees e ON l.employee_id = e.id
  `;

  const params: any[] = [];

  if (q) {
    query += ` WHERE (l.protocol_number LIKE ? OR e.name LIKE ? OR sc.nome LIKE ?)`;
    const likeQ = `%${q}%`;
    params.push(likeQ, likeQ, likeQ);
  }

  const orderBy = safeSort === 'company_name' ? 'sc.nome' : 
                  safeSort === 'employee_name' ? 'e.name' :
                  `l.${safeSort}`;
                  
  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const leaves = await db.prepare(query).all(...params) as any[];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Afastamentos</h2>
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
                         // Parse local date explicitly to avoid timezone issues
                         const cleanDate = leave.start_date.trim().split('T')[0];
                         const [y, m, d] = cleanDate.split('-').map(Number);
                         const localDate = new Date(y, m - 1, d);
                         formattedStartDate = format(localDate, 'dd/MM/yyyy');
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
                    <TableCell>{leave.type}</TableCell>
                    <TableCell>{formattedStartDate}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${leave.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${leave.status === 'RECTIFIED' ? 'bg-orange-100 text-orange-800' : ''}
                        ${leave.status === 'APPROVED' ? 'bg-[#06276b]/10 text-[#06276b]' : ''}
                        ${leave.status === 'COMPLETED' ? 'bg-[#06276b]/10 text-[#06276b]' : ''}
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
