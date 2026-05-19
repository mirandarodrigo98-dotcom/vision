import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getEmployeeHistory } from '@/app/actions/histories';
import { HistoryActions } from '@/components/histories/history-actions';
import { HistoryForm } from '@/components/histories/history-form';

export const dynamic = 'force-dynamic';

export default async function AdminViewHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

  const { id } = await params;
  const history = await getEmployeeHistory(id);
  if (!history) {
    redirect('/admin/histories');
  }

  if (session.role === 'operator') {
    const restricted = (await db.query(`
      SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2
    `, [session.user_id, history.company_id])).rows[0];

    if (restricted) {
      redirect('/admin/histories');
    }
  }

  const companies = session.role === 'operator'
    ? (await db.query(`
      SELECT id, COALESCE(razao_social, nome) AS nome, cnpj
      FROM client_companies
      WHERE id NOT IN (
        SELECT company_id FROM user_restricted_companies WHERE user_id = $1
      )
      ORDER BY COALESCE(razao_social, nome)
    `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>
    : (await db.query(`
      SELECT id, COALESCE(razao_social, nome) AS nome, cnpj
      FROM client_companies
      ORDER BY COALESCE(razao_social, nome)
    `, [])).rows as Array<{ id: string; nome: string; cnpj: string }>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Visualizar Solicitação de Histórico</h1>
          <p className="text-muted-foreground">
            Atenda a solicitação enviada pelo cliente seguindo o fluxo padrão do departamento pessoal.
          </p>
        </div>

        <HistoryActions
          historyId={history.id}
          status={history.status}
          employeeName={history.employee_name}
          isAdmin
        />
      </div>

      <HistoryForm
        companies={companies}
        activeCompanyId={history.company_id}
        initialData={history}
        isEditing
        readOnly
        redirectPath="/admin/histories"
      />
    </div>
  );
}
