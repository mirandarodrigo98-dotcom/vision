import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';

import { AdmissionActions } from '@/components/admissions/admission-actions';
import { hasPermission } from '@/lib/rbac';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default async function AdmissionsListPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const canCreate = await hasPermission(session.role, 'admissions.create');

  if (session.role === 'admin' || session.role === 'operator') {
    redirect('/admin/dashboard');
  }

  // Filter by Active Company
  const activeCompanyId = session.active_company_id;

  if (!activeCompanyId) {
      return <div className="p-8 text-center text-muted-foreground">Selecione uma empresa para visualizar as admissões.</div>;
  }

  const admissions = await db.prepare(`
    SELECT a.*, to_char(a.admission_date::date, 'YYYY-MM-DD') as admission_date, c.nome as company_name
    FROM admission_requests a
    JOIN client_companies c ON a.company_id = c.id
    WHERE a.company_id = ?
    ORDER BY a.created_at DESC
  `).all(activeCompanyId) as Array<{
    id: string;
    employee_full_name: string;
    job_role: string;
    admission_date: string;
    status: string;
    protocol_number: string;
    created_at: string;
    company_name: string;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Admissões</h1>
        {canCreate ? (
          <Link href="/app/admissions/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova Admissão
            </Button>
          </Link>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div tabIndex={0}>
                  <Button disabled>
                    <Plus className="mr-2 h-4 w-4" /> Nova Admissão
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Você não tem permissão para criar novas admissões.</p>
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
              <TableHead>Cargo</TableHead>
              <TableHead>Data Admissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Protocolo</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admissions.map((adm) => (
              <TableRow key={adm.id}>
                <TableCell className="font-medium">{adm.employee_full_name}</TableCell>
                <TableCell>{adm.job_role}</TableCell>
                <TableCell>{adm.admission_date ? adm.admission_date.split('-').reverse().join('/') : '-'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${adm.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : ''}
                    ${adm.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${adm.status === 'RECTIFIED' ? 'bg-orange-100 text-orange-800' : ''}
                    ${adm.status === 'EMAILED' ? 'bg-[#06276b]/10 text-[#06276b]' : ''}
                    ${adm.status === 'COMPLETED' ? 'bg-[#06276b]/10 text-[#06276b]' : ''}
                    ${adm.status === 'ERROR' ? 'bg-red-100 text-red-800' : ''}
                    ${adm.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                  `}>
                    {
                      adm.status === 'SUBMITTED' ? 'Enviado' : 
                      adm.status === 'RECTIFIED' ? 'Retificado' :
                      adm.status === 'ERROR' ? 'Erro' : 
                      adm.status === 'DRAFT' ? 'Rascunho' : 
                      adm.status === 'CANCELLED' ? 'Cancelado' : 
                      adm.status === 'EMAILED' ? 'Enviado' :
                      adm.status === 'COMPLETED' ? 'Concluído' :
                      adm.status
                    }
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs">{adm.protocol_number || '-'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(adm.created_at), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell className="text-center">
                  <AdmissionActions 
                    admissionId={adm.id} 
                    admissionDate={adm.admission_date} 
                    status={adm.status}
                    employeeName={adm.employee_full_name}
                  />
                </TableCell>
              </TableRow>
            ))}
            {admissions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma admissão encontrada. Clique em &quot;Nova Admissão&quot; para começar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
