import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getRolePermissions } from '@/app/actions/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { getContracts } from '@/app/actions/societario-contracts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getProcessesFiltered } from '@/app/actions/societario-processes';
import { ProcessFilters } from '@/components/societario/processes-filters';
import { ProcessActions } from '@/components/societario/process-actions';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SocietarioPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getRolePermissions(session.role);
  if (!permissions.includes('societario.view')) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  const contratos = await getContracts();
  const params = await searchParams;
  const activeTab = typeof params.tab === 'string' ? params.tab : 'contratos';
  const filters = {
    company: typeof params.company === 'string' ? params.company : undefined,
    cnpj: typeof params.cnpj === 'string' ? params.cnpj : undefined,
    type: typeof params.type === 'string' ? params.type : undefined,
    status: typeof params.status === 'string' ? params.status : undefined,
  };
  const processos = await getProcessesFiltered(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Societário</h1>
      </div>

      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-auto">
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="processos">Processos</TabsTrigger>
        </TabsList>

        <TabsContent value="processos" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Processos</h2>
              <Link href="/admin/societario/processos/new">
                <Button>Novo processo</Button>
              </Link>
            </div>
            <ProcessFilters />
            <div className="border rounded-md bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processos.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.company_cnpj || p.cnpj || '-'}</TableCell>
                      <TableCell className="font-medium">{p.razao_social || p.company_name || '-'}</TableCell>
                      <TableCell>{p.type}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold
                            ${p.status === 'NAO_INICIADO' ? 'bg-gray-100 text-gray-800' : ''}
                            ${p.status === 'EM_ANDAMENTO' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${p.status === 'CONCLUIDO' ? 'bg-[#06276b]/10 text-[#06276b]' : ''}
                          `}
                        >
                          {p.status === 'NAO_INICIADO'
                            ? 'Não iniciado'
                            : p.status === 'EM_ANDAMENTO'
                            ? 'Em andamento'
                            : p.status === 'CONCLUIDO'
                            ? 'Concluído'
                            : p.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <ProcessActions processId={p.id} status={p.status} type={p.type} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {processos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Nenhum processo encontrado com os filtros informados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contratos" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Modelos de Contrato</CardTitle>
              <Link href="/admin/societario/contratos/new">
                <Button>Novo contrato</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Autor</TableHead>
                      <TableHead>Atualizado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contratos.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.title}</TableCell>
                        <TableCell>{c.author_name || '-'}</TableCell>
                        <TableCell>{new Date(c.updated_at).toLocaleString('pt-BR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
