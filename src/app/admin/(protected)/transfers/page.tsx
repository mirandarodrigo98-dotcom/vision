import db from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ColumnHeader } from '@/components/ui/column-header';
import { TransferActions } from '@/components/transfers/transfer-actions';
import { TransferFilters } from '@/components/transfers/transfer-filters';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface AdminTransfersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminTransfersPage({ searchParams }: AdminTransfersPageProps) {
  const session = await getSession();
  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  
  // Filter params
  const name = typeof resolvedSearchParams.name === 'string' ? resolvedSearchParams.name : '';
  const company = typeof resolvedSearchParams.company === 'string' ? resolvedSearchParams.company : '';
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : '';
  const startDate = typeof resolvedSearchParams.start_date === 'string' ? resolvedSearchParams.start_date : '';
  const endDate = typeof resolvedSearchParams.end_date === 'string' ? resolvedSearchParams.end_date : '';
  const transferDate = typeof resolvedSearchParams.transfer_date === 'string' ? resolvedSearchParams.transfer_date : '';

  // Whitelist allowed sort columns
  const allowedSorts = ['protocol_number', 'created_at', 'source_company_name', 'target_company_name', 'employee_name', 'status', 'transfer_date'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = `
    SELECT 
      t.*,
      sc.nome as source_company_name
    FROM transfer_requests t
    JOIN client_companies sc ON t.source_company_id = sc.id
    WHERE 1=1
  `;

  const params: any[] = [];

  if (session) {
    if (session.role === 'client_user') {
      query += ` AND t.source_company_id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
      params.push(session.user_id);
    } else if (session.role === 'operator') {
      query += ` AND (t.source_company_id IS NULL OR t.source_company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?))`;
      params.push(session.user_id);
    }
  }

  if (name) {
    query += ` AND t.employee_name LIKE ?`;
    params.push(`%${name}%`);
  }

  if (company && company.length >= 3) {
    query += ` AND (sc.razao_social LIKE ? OR sc.nome LIKE ?)`;
    params.push(`%${company}%`, `%${company}%`);
  }

  if (status && status !== 'all') {
    query += ` AND t.status = ?`;
    params.push(status);
  }

  if (startDate) {
    query += ` AND date(t.created_at) >= date(?)`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND date(t.created_at) <= date(?)`;
    params.push(endDate);
  }

  if (transferDate) {
    query += ` AND date(t.transfer_date) = date(?)`;
    params.push(transferDate);
  }

  const orderBy = safeSort === 'source_company_name' ? 'sc.nome' : `t.${safeSort}`;
  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const transfersData = await db.prepare(query).all(...params) as any[];

  // Serialize dates to avoid Server Components render error
  const transfers = transfersData.map(transfer => ({
    ...transfer,
    transfer_date: transfer.transfer_date ? new Date(transfer.transfer_date).toISOString() : null,
    created_at: transfer.created_at ? new Date(transfer.created_at).toISOString() : null,
    updated_at: transfer.updated_at ? new Date(transfer.updated_at).toISOString() : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Transferências</h2>
      </div>

      <TransferFilters />

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
                <ColumnHeader column="source_company_name" title="Origem" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="employee_name" title="Funcionário" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="target_company_name" title="Destino" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="transfer_date" title="Data Transferência" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="status" title="Status" />
              </TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma transferência encontrada.
                </TableCell>
              </TableRow>
            ) : (
              transfers.map((tr) => {
                let formattedCreatedAt = 'Data inválida';
                let formattedTransferDate = '-';
                try {
                    if (tr.created_at) {
                        formattedCreatedAt = format(new Date(tr.created_at), 'dd/MM/yyyy HH:mm');
                    }
                    if (tr.transfer_date) {
                        formattedTransferDate = format(new Date(tr.transfer_date), 'dd/MM/yyyy');
                    }
                } catch (e) {
                    console.error('Error formatting date', e);
                }

                return (
                  <TableRow key={tr.id}>
                    <TableCell className="font-mono text-xs">{tr.protocol_number}</TableCell>
                    <TableCell>{formattedCreatedAt}</TableCell>
                    <TableCell>{tr.source_company_name}</TableCell>
                    <TableCell>{tr.employee_name}</TableCell>
                    <TableCell>{tr.target_company_name}</TableCell>
                    <TableCell>{formattedTransferDate}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${tr.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${tr.status === 'RECTIFIED' ? 'bg-orange-100 text-orange-800' : ''}
                         ${tr.status === 'APPROVED' ? 'bg-primary/10 text-primary' : ''}
                         ${tr.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : ''}
                         ${tr.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                         ${tr.status === 'REJECTED' ? 'bg-red-200 text-red-900' : ''}
                       `}>
                         {
                           tr.status === 'SUBMITTED' ? 'Solicitado' : 
                           tr.status === 'RECTIFIED' ? 'Retificado' :
                           tr.status === 'APPROVED' ? 'Concluído' :
                           tr.status === 'COMPLETED' ? 'Concluído' :
                           tr.status === 'CANCELLED' ? 'Cancelado' : 
                           tr.status === 'REJECTED' ? 'Rejeitado' :
                           tr.status
                         }
                       </span>
                    </TableCell>
                    <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                             <TransferActions 
                                transferId={tr.id}
                                transferDate={tr.transfer_date}
                                status={tr.status}
                                employeeName={tr.employee_name}
                                isAdmin={true}
                                basePath="/admin"
                             />
                        </div>
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
