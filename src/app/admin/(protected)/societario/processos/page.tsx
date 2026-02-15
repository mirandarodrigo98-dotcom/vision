import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getRolePermissions } from '@/app/actions/permissions';
import { getProcesses } from '@/app/actions/societario-processes';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';

export default async function ProcessosPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const perms = await getRolePermissions(session.role);
  if (!perms.includes('societario.view')) {
    return <div className="p-6">Sem permissão</div>;
  }

  const processos = await getProcesses() as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Processos</h1>
        <Link href="/admin/societario/processos/new">
          <Button><Plus className="mr-2 h-4 w-4" /> Novo Processo</Button>
        </Link>
      </div>
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CNPJ</TableHead>
              <TableHead>Razão Social</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processos.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.company_cnpj || '-'}</TableCell>
                <TableCell className="font-medium">{p.razao_social || p.company_name || '-'}</TableCell>
                <TableCell>{p.type}</TableCell>
                <TableCell>{p.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
