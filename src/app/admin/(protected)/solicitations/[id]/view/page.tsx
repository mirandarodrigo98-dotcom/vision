import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getSolicitation } from '@/app/actions/solicitations';
import { SolicitationActions } from '@/components/solicitations/solicitation-actions';
import { SolicitationForm } from '@/components/solicitations/solicitation-form';

export const dynamic = 'force-dynamic';

export default async function AdminViewSolicitationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

  const { id } = await params;
  const solicitation = await getSolicitation(id);
  if (!solicitation) {
    redirect('/admin/solicitations');
  }

  if (session.role === 'operator') {
    const restricted = (await db.query(`
      SELECT 1 FROM user_restricted_companies WHERE user_id = $1 AND company_id = $2
    `, [session.user_id, solicitation.company_id])).rows[0];

    if (restricted || solicitation.department_id !== session.department_id) {
      redirect('/admin/solicitations');
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
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Visualizar Solicitacao</h1>
          <p className="text-muted-foreground">
            Atenda a demanda enviada pelo cliente seguindo o fluxo padrao do departamento.
          </p>
        </div>

        <SolicitationActions
          solicitationId={solicitation.id}
          status={solicitation.status}
          subject={solicitation.subject}
          isAdmin
        />
      </div>

      <SolicitationForm
        companies={companies}
        activeCompanyId={solicitation.company_id}
        requestType={{
          id: solicitation.request_type_id,
          name: solicitation.request_type_name,
          description: solicitation.request_type_description,
          department_name: solicitation.department_name,
        }}
        initialData={solicitation}
        isEditing
        readOnly
        redirectPath="/admin/solicitations"
      />
    </div>
  );
}
