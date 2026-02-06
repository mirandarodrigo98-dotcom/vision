import db from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { SearchInput } from '@/components/ui/search-input';
import { ColumnHeader } from '@/components/ui/column-header';
import Link from 'next/link';
import { Eye, Plus } from 'lucide-react';
import { TransferActions } from '@/components/transfers/transfer-actions';
import { Badge } from '@/components/ui/badge';

interface AdminTransfersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminTransfersPage({ searchParams }: AdminTransfersPageProps) {
  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';

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
  `;

  const params: any[] = [];

  if (q) {
    query += ` WHERE (t.protocol_number LIKE ? OR t.employee_name LIKE ? OR sc.nome LIKE ? OR t.target_company_name LIKE ?)`;
    const likeQ = `%${q}%`;
    params.push(likeQ, likeQ, likeQ, likeQ);
  }

  const orderBy = safeSort === 'source_company_name' ? 'sc.nome' : `t.${safeSort}`;
  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const transfers = await db.prepare(query).all(...params) as any[];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Transferências</h2>
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
                         ${tr.status === 'APPROVED' ? 'bg-green-100 text-green-800' : ''}
                         ${tr.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ''}
                         ${tr.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                         ${tr.status === 'REJECTED' ? 'bg-red-200 text-red-900' : ''}
                       `}>
                         {
                           tr.status === 'SUBMITTED' ? 'Solicitado' : 
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
