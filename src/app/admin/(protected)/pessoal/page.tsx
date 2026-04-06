import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserGroupIcon, DocumentPlusIcon, DocumentMinusIcon, SunIcon, ArrowsRightLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default async function PessoalPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('employees.view')) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Departamento Pessoal</h1>
        <p className="text-muted-foreground mt-2">
          Gestão de funcionários, admissões, demissões, férias e afastamentos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5" />
              Funcionários
            </CardTitle>
            <CardDescription>
              Cadastro e lista de todos os colaboradores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/employees">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DocumentPlusIcon className="h-5 w-5" />
              Admissões
            </CardTitle>
            <CardDescription>
              Processo de entrada de novos funcionários.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/admissions">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DocumentMinusIcon className="h-5 w-5" />
              Demissões
            </CardTitle>
            <CardDescription>
              Registros e processos de desligamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/dismissals">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SunIcon className="h-5 w-5" />
              Férias
            </CardTitle>
            <CardDescription>
              Controle de férias e agendamentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/vacations">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowsRightLeftIcon className="h-5 w-5" />
              Transferências
            </CardTitle>
            <CardDescription>
              Movimentações e trocas de setor/empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/transfers">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" />
              Afastamentos
            </CardTitle>
            <CardDescription>
              Registro de licenças médicas, atestados e outros.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/leaves">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
