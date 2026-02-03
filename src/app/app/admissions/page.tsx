import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';

import { AdmissionActions } from '@/components/admissions/admission-actions';

export default async function AdmissionsListPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (session.role === 'admin' || session.role === 'operator') {
    redirect('/admin/dashboard');
  }

  // Get User Companies (User might have access to multiple)
  const userCompanies = await db.prepare('SELECT company_id FROM user_companies WHERE user_id = ?').all(session.user_id) as Array<{ company_id: string }>;

  if (userCompanies.length === 0) {
      return <div>Você não está vinculado a nenhuma empresa. Contate o suporte.</div>;
  }

  const companyIds = userCompanies.map(c => c.company_id);
  const placeholders = companyIds.map(() => '?').join(',');

  const admissions = await db.prepare(`
    SELECT a.*, c.nome as company_name
    FROM admission_requests a
    JOIN client_companies c ON a.company_id = c.id
    WHERE a.company_id IN (${placeholders})
    ORDER BY a.created_at DESC
  `).all(...companyIds) as Array<{
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
        <Link href="/app/admissions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nova Admissão
          </Button>
        </Link>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
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
                <TableCell className="font-medium text-xs text-muted-foreground">{adm.company_name}</TableCell>
                <TableCell className="font-medium">{adm.employee_full_name}</TableCell>
                <TableCell>{adm.job_role}</TableCell>
                <TableCell>{adm.admission_date ? format(new Date(adm.admission_date), 'dd/MM/yyyy') : '-'}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${adm.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : ''}
                    ${adm.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' : ''}
                    ${adm.status === 'RECTIFIED' ? 'bg-orange-100 text-orange-800' : ''}
                    ${adm.status === 'EMAILED' ? 'bg-green-100 text-green-800' : ''}
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
