import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon, BuildingOfficeIcon, UserGroupIcon, UsersIcon, IdentificationIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default async function CadastroPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  const hasCadastroAccess = [
    'companies.view',
    'employees.view',
    'socios.view',
    'client_users.view',
    'team.view',
    'departments.view'
  ].some(p => permissions.includes(p));

  if (!hasCadastroAccess) {
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
        <Link href="/admin/clients" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="h-5 w-5" />
                  Empresas
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Gestão de empresas clientes.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/socios" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="h-5 w-5" />
                  Sócios
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Quadro societário e informações dos sócios.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/accountants" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <IdentificationIcon className="h-5 w-5" />
                  Contadores
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Cadastro de contadores parceiros.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/registrations/departments" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <BuildingStorefrontIcon className="h-5 w-5" />
                  Departamentos
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Estrutura de departamentos do escritório.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/client-users" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5" />
                  Usuário do Cliente
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Gestão de acessos para usuários clientes.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/team" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5" />
                  Usuários do Escritório
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Membros da equipe interna e operadores.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
