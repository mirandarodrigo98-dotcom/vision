import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';
import { LeaveActions } from '@/components/leaves/leave-actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default async function LeavesListPage() {
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

  const leaves = await db.prepare(`
    SELECT l.*, c.nome as company_name, e.name as employee_name
    FROM leaves l
    JOIN client_companies c ON l.company_id = c.id
    JOIN employees e ON l.employee_id = e.id
    WHERE l.company_id = ?
    ORDER BY l.created_at DESC
  `).all(activeCompanyId) as Array<{
    id: string;
    company_name: string;
    employee_name: string;
    start_date: string;
    type: string;
    status: string;
    protocol_number: string;
    created_at: string;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Afastamentos</h1>
        <Link href="/app/leaves/new">
            <Button>
                <Plus className="mr-2 h-4 w-4" /> Novo Afastamento
            </Button>
        </Link>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data Início</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Protocolo</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaves.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum afastamento encontrado.
                    </TableCell>
                </TableRow>
            ) : (
                leaves.map((leave) => (
                <TableRow key={leave.id}>
                    <TableCell className="font-medium">{leave.employee_name}</TableCell>
                    <TableCell>{leave.type}</TableCell>
                    <TableCell>{leave.start_date ? format(new Date(leave.start_date), 'dd/MM/yyyy') : '-'}</TableCell>
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
                    <TableCell className="font-mono text-xs">{leave.protocol_number || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(leave.created_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                        <LeaveActions 
                            leaveId={leave.id} 
                            startDate={leave.start_date} 
                            status={leave.status}
                            employeeName={leave.employee_name}
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
