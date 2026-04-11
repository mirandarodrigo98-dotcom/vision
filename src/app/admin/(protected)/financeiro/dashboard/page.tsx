import { DashboardFinanceiro } from '@/components/financeiro/dashboard-financeiro';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard Financeiro | Vision',
  description: 'Dashboard com indicadores financeiros integrados ao Omie'
};

export default function DashboardFinanceiroPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Financeiro</h1>
          <p className="text-muted-foreground">Visão geral de receitas e indicadores extraídos do Omie.</p>
        </div>
      </div>
      <DashboardFinanceiro />
    </div>
  );
}
