import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default async function FinanceiroPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  const isAdmin = session.role === 'admin';
  const canViewContabilidade = isAdmin || permissions.includes('financeiro.cobranca.contabilidade.view');
  const canViewConsultoria = isAdmin || permissions.includes('financeiro.cobranca.consultoria.view');
  const canViewDashContabilidade = isAdmin || permissions.includes('financeiro.dashboard.contabilidade');
  const canViewDashConsultoria = isAdmin || permissions.includes('financeiro.dashboard.consultoria');

  if (!canViewContabilidade && !canViewConsultoria && !canViewDashContabilidade && !canViewDashConsultoria) {
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
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground mt-2">
          Gestão financeira do escritório e integração com ERP.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        
        {canViewDashContabilidade && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5" />
              Dashboard Contabilidade
            </CardTitle>
            <CardDescription>
              Métricas e indicadores em tempo real das receitas, ticket médio e clientes baseados no Omie (Contabilidade).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/financeiro/dashboard">
              <Button className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white">Acessar Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
        )}

        {canViewDashConsultoria && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5" />
              Dashboard Consultoria
            </CardTitle>
            <CardDescription>
              Métricas e indicadores em tempo real das receitas, ticket médio e clientes baseados no Omie (Consultoria).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/financeiro/dashboard-consultoria">
              <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white">Acessar Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
        )}

        {canViewContabilidade && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5" />
              Contas a Receber (NZD Contabilidade)
            </CardTitle>
            <CardDescription>
              Consulte e acompanhe boletos recebidos, inadimplência e integrações de recebimentos via Omie.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/financeiro/cobranca">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>
        )}

        {canViewConsultoria && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-5 w-5" />
              Contas a Receber (NZD Consultoria)
            </CardTitle>
            <CardDescription>
              Consulte e acompanhe boletos recebidos, inadimplência e integrações de recebimentos da Consultoria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/financeiro/cobranca-consultoria">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}
