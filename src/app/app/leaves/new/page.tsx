import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { LeaveForm } from '@/components/leaves/leave-form';

export default async function NewLeavePage() {
  const session = await getSession();
  if (!session || session.role !== 'client_user') redirect('/login');

  const activeCompanyId = session.active_company_id;
  if (!activeCompanyId) {
    return <div>Selecione uma empresa para continuar.</div>;
  }

  const companies = await db.prepare(`
    SELECT cc.id, cc.nome, cc.cnpj 
    FROM client_companies cc
    JOIN user_companies uc ON uc.company_id = cc.id
    WHERE uc.user_id = ?
    ORDER BY cc.nome
  `).all(session.user_id) as Array<{ id: string; nome: string; cnpj: string }>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Novo Afastamento</h1>
        <p className="text-muted-foreground">
          Preencha os dados abaixo para solicitar um afastamento.
        </p>
      </div>
      
      <LeaveForm companies={companies} activeCompanyId={activeCompanyId} />
    </div>
  );
}
