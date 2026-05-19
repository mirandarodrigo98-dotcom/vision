import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserPermissions } from '@/app/actions/permissions';
import { HistoryForm } from '@/components/histories/history-form';

export const dynamic = 'force-dynamic';

export default async function NewHistoryPage() {
  const session = await getSession();
  if (!session || session.role !== 'client_user') redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('histories.create')) {
    redirect('/app/histories');
  }

  const activeCompanyId = session.active_company_id;
  if (!activeCompanyId) {
    return <div>Selecione uma empresa para continuar.</div>;
  }

  const companies = (await db.query(`
    SELECT cc.id, COALESCE(cc.razao_social, cc.nome) AS nome, cc.cnpj
    FROM client_companies cc
    JOIN user_companies uc ON uc.company_id = cc.id
    WHERE uc.user_id = $1
    ORDER BY COALESCE(cc.razao_social, cc.nome)
  `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Nova Solicitação de Histórico</h1>
        <p className="text-muted-foreground">
          Registre alterações cadastrais, salariais, benefícios, exames e demais solicitações do colaborador.
        </p>
      </div>

      <HistoryForm companies={companies} activeCompanyId={activeCompanyId} />
    </div>
  );
}
