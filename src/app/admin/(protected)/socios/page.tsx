import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getRolePermissions } from '@/app/actions/permissions';
import { getSocios } from '@/app/actions/socios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { SocioActions } from '@/components/socios/socio-actions';
import Link from 'next/link';
import { Plus } from 'lucide-react';

interface SociosListPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getAllowed() {
  const session = await getSession();
  if (!session) return false;
  const perms = await getRolePermissions(session.role);
  const canView =
    session.role === 'admin' ||
    perms.some((p) => p.permission === 'societario.view' || p.permission === 'societario.edit');
  return canView;
}

export default async function SociosListPage({ searchParams }: SociosListPageProps) {
  const allowed = await getAllowed();
  if (!allowed) {
    redirect('/admin/dashboard');
  }

  const resolvedSearchParams = await searchParams;
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';
  const socios = await getSocios(q);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Sócios</h1>
        <Button asChild>
          <Link href="/admin/socios/new">
            <Plus className="mr-2 h-4 w-4" />
            Incluir Sócio
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <SearchInput placeholder="Buscar por nome, CPF ou empresa..." />
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {socios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum sócio encontrado.
                </TableCell>
              </TableRow>
            ) : (
              socios.map((socio: any) => (
                <TableRow key={socio.id}>
                  <TableCell>{socio.company_name || '-'}</TableCell>
                  <TableCell>{socio.nome}</TableCell>
                  <TableCell>{socio.cpf}</TableCell>
                  <TableCell className="text-right">
                    <SocioActions 
                      socioId={socio.id} 
                      companyId={socio.company_id}
                      isActive={socio.is_active !== false} // Default to true if null
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
