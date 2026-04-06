import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BuildingOfficeIcon, UserGroupIcon, UsersIcon, IdentificationIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default async function CadastroPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('clients.view')) {
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
        <h1 className="text-3xl font-bold tracking-tight">Cadastro</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as empresas, sócios, contadores e departamentos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BuildingOfficeIcon className="h-5 w-5" />
              Empresas
            </CardTitle>
            <CardDescription>
              Gestão de empresas clientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/clients">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5" />
              Sócios
            </CardTitle>
            <CardDescription>
              Quadro societário e informações dos sócios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/socios">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IdentificationIcon className="h-5 w-5" />
              Contadores
            </CardTitle>
            <CardDescription>
              Cadastro de contadores parceiros.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/accountants">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BuildingStorefrontIcon className="h-5 w-5" />
              Departamentos
            </CardTitle>
            <CardDescription>
              Estrutura de departamentos do escritório.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/registrations/departments">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Usuário do Cliente
            </CardTitle>
            <CardDescription>
              Gestão de acessos para usuários clientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/client-users">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Usuários do Escritório
            </CardTitle>
            <CardDescription>
              Membros da equipe interna e operadores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/team">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
