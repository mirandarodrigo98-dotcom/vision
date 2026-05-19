import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon, UserGroupIcon, DocumentPlusIcon, DocumentMinusIcon, SunIcon, ArrowsRightLeftIcon, ExclamationTriangleIcon, TruckIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default async function PessoalPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  const hasPessoalAccess = session.role === 'admin' || [
    'employees.view',
    'admissions.view',
    'dismissals.view',
    'vacations.view',
    'transfers.view',
    'leaves.view',
    'vt.view',
    'payroll_variables.view',
    'histories.view',
  ].some((permission) => permissions.includes(permission));

  if (!hasPessoalAccess) {
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
        <Link href="/admin/employees" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="h-5 w-5" />
                  Funcionários
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Cadastro e lista de todos os colaboradores.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/admissions" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <DocumentPlusIcon className="h-5 w-5" />
                  Admissões
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Processos de novas contratações.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/dismissals" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <DocumentMinusIcon className="h-5 w-5" />
                  Demissões
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Rescisões e desligamentos.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/vacations" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <SunIcon className="h-5 w-5" />
                  Férias
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Controle de períodos aquisitivos e recibos.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/transfers" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <ArrowsRightLeftIcon className="h-5 w-5" />
                  Transferências
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Mudanças de cargo, local ou empresa.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/leaves" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  Afastamentos
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Controle de licenças e atestados.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/vt" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <TruckIcon className="h-5 w-5" />
                  Vale Transporte
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Pedidos e rascunhos de Vale Transporte.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/payroll-variables" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <DocumentPlusIcon className="h-5 w-5" />
                  Variáveis da Folha
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Lançamentos de eventos e variáveis da folha.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/histories" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5" />
                  Históricos
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Solicitações de alterações cadastrais, salariais, benefícios, exames e CAT.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
