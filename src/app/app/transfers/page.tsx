import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';
import { TransferActions } from '@/components/transfers/transfer-actions';
import { Badge } from '@/components/ui/badge';
import { hasPermission } from '@/lib/rbac';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default async function TransfersListPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (session.role === 'admin' || session.role === 'operator') {
    redirect('/admin/dashboard');
  }

  // Get User Companies
  const userCompanies = await db.prepare('SELECT company_id FROM user_companies WHERE user_id = ?').all(session.user_id) as Array<{ company_id: string }>;

  if (userCompanies.length === 0) {
      return <div>Você não está vinculado a nenhuma empresa. Contate o suporte.</div>;
  }

  const activeCompanyId = session.active_company_id;
  if (!activeCompanyId) return <div className="p-8 text-center text-muted-foreground">Selecione uma empresa.</div>;

  const hasCreatePermission = await hasPermission(session.role, 'transfers.create');
  const hasMultipleCompanies = userCompanies.length > 1;
  const canCreate = hasCreatePermission && hasMultipleCompanies;

  const transfers = await db.prepare(`
    SELECT t.id, t.employee_name, t.status, t.protocol_number, t.created_at,
           c.nome as source_company_name,
           tc.nome as target_company_name,
           to_char(t.transfer_date::date, 'YYYY-MM-DD') as transfer_date
    FROM transfer_requests t
    JOIN client_companies c ON t.source_company_id = c.id
    LEFT JOIN client_companies tc ON t.target_company_id = tc.id
    WHERE t.source_company_id = ?
    ORDER BY t.created_at DESC
  `).all(activeCompanyId) as Array<{
    id: string;
    source_company_name: string;
    target_company_name: string;
    employee_name: string;
    transfer_date: string;
    status: string;
    protocol_number: string;
    created_at: string;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Transferências</h1>
        {canCreate ? (
          <Link href="/app/transfers/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova Transferência
            </Button>
          </Link>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div tabIndex={0}>
                  <Button disabled>
                    <Plus className="mr-2 h-4 w-4" /> Nova Transferência
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{!hasCreatePermission 
                  ? "Você não tem permissão para criar novas transferências."
                  : "É necessário ter mais de uma empresa vinculada para realizar transferências."
                }</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead className="text-center">Empresa Destino</TableHead>
              <TableHead className="text-center">Data Transferência</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Protocolo</TableHead>
              <TableHead className="text-center">Data Inclusão</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma transferência encontrada.
                    </TableCell>
                </TableRow>
            ) : (
                transfers.map((tr) => (
                <TableRow key={tr.id}>
                    <TableCell className="font-medium">{tr.employee_name}</TableCell>
                    <TableCell className="text-center">{tr.target_company_name || '-'}</TableCell>
                    <TableCell className="text-center">{tr.transfer_date ? tr.transfer_date.split('-').reverse().join('/') : '-'}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${tr.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${tr.status === 'RECTIFIED' ? 'bg-orange-100 text-orange-800' : ''}
                        ${tr.status === 'APPROVED' ? 'bg-[#06276b]/10 text-[#06276b]' : ''}
                        ${tr.status === 'COMPLETED' ? 'bg-[#06276b]/10 text-[#06276b]' : ''}
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
                    <TableCell className="font-mono text-xs text-center">{tr.protocol_number || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm text-center">
                        {format(new Date(tr.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-center">
                        <TransferActions 
                            transferId={tr.id} 
                            transferDate={tr.transfer_date} 
                            status={tr.status}
                            employeeName={tr.employee_name}
                        />
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
