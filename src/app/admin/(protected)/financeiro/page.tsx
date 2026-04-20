import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon, CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
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
        <Link href="/admin/financeiro/dashboard" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5" />
                  Dashboard Contabilidade
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Métricas e indicadores em tempo real das receitas, ticket médio e clientes baseados no Omie (Contabilidade).
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        )}

        {canViewDashConsultoria && (
        <Link href="/admin/financeiro/dashboard-consultoria" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5" />
                  Dashboard Consultoria
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Métricas e indicadores em tempo real das receitas, ticket médio e clientes baseados no Omie (Consultoria).
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        )}

        {canViewContabilidade && (
        <Link href="/admin/financeiro/cobranca" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <CurrencyDollarIcon className="h-5 w-5" />
                  Contas a Receber (NZD Contabilidade)
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Consulte e acompanhe boletos recebidos, inadimplência e integrações de recebimentos via Omie.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        )}

        {canViewConsultoria && (
        <Link href="/admin/financeiro/cobranca-consultoria" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <CurrencyDollarIcon className="h-5 w-5" />
                  Contas a Receber (NZD Consultoria)
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Consulte e acompanhe boletos recebidos, inadimplência e integrações de recebimentos da Consultoria.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        )}
      </div>
    </div>
  );
}
