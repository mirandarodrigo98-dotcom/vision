import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDashboardMetrics } from '@/app/actions/dashboard';
import { HRMetricsSection } from '@/components/dashboard/hr-metrics-section';

export default async function ClientDashboard() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (session.role === 'admin' || session.role === 'operator') {
    redirect('/admin/dashboard');
  }

  // Get User Companies to check access
  const companies = await db.prepare(`
    SELECT 1
    FROM user_companies uc
    WHERE uc.user_id = ?
    LIMIT 1
  `).get(session.user_id);

  if (!companies) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Bem-vindo ao Vision</h2>
            <p className="text-gray-500">Você ainda não está vinculado a nenhuma empresa.</p>
            <p className="text-sm text-gray-400">Entre em contato com o suporte para liberar seu acesso.</p>
        </div>
      );
  }

  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Painel Geral</h1>
      </div>

      <HRMetricsSection metrics={metrics} />
    </div>
  );
}
