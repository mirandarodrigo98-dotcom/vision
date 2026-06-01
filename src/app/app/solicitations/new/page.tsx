import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserPermissions } from '@/app/actions/permissions';
import { getSolicitationType } from '@/app/actions/solicitation-types';
import { ensureSolicitationsTables } from '@/lib/solicitations-db';
import { SolicitationForm } from '@/components/solicitations/solicitation-form';

export const dynamic = 'force-dynamic';

interface NewSolicitationPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewSolicitationPage({ searchParams }: NewSolicitationPageProps) {
  const session = await getSession();
  if (!session || session.role !== 'client_user') redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('solicitations.create')) {
    redirect('/app/solicitations');
  }

  const activeCompanyId = session.active_company_id;
  if (!activeCompanyId) {
    return <div>Selecione uma empresa para continuar.</div>;
  }

  await ensureSolicitationsTables();

  const resolvedSearchParams = await searchParams;
  const typeId = typeof resolvedSearchParams.type === 'string' ? resolvedSearchParams.type : '';
  if (!typeId) redirect('/app/solicitations');

  const requestTypeResult = await getSolicitationType(typeId);
  const requestType = requestTypeResult.data;
  if (!requestType || !requestType.is_active) {
    redirect('/app/solicitations');
  }

  const companies = (await db.query(`
    SELECT cc.id, COALESCE(cc.razao_social, cc.nome) AS nome, cc.cnpj
    FROM client_companies cc
    JOIN user_companies uc ON uc.company_id = cc.id
    WHERE uc.user_id = $1
    ORDER BY COALESCE(cc.razao_social, cc.nome)
  `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Nova Solicitacao</h1>
        <p className="text-muted-foreground">
          Registre uma demanda para o departamento responsavel e acompanhe o andamento pelo portal.
        </p>
      </div>

      <SolicitationForm
        companies={companies}
        activeCompanyId={activeCompanyId}
        requestType={requestType}
      />
    </div>
  );
}
