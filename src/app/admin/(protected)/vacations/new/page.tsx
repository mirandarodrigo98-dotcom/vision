import { VacationForm } from '@/components/vacations/vacation-form';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';

export const dynamic = 'force-dynamic';

export default async function NewVacationPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // Permission Check
  let hasPermission = false;
  if (session.role === 'admin') hasPermission = true;
  else {
      const permissions = await getUserPermissions();
      hasPermission = permissions.includes('vacations.create');
  }

  if (!hasPermission) {
      return (
          <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </div>
      );
  }

  let companies = [];
  if (session.role === 'admin') {
    // Admin sees all companies
    companies = (await db.query(`
        SELECT id, nome, cnpj FROM client_companies ORDER BY nome
    `, [])).rows as Array<{ id: string; nome: string; cnpj: string }>;
  } else if (session.role === 'operator') {
    // Operator sees all companies except restricted ones
    companies = (await db.query(`
        SELECT id, nome, cnpj 
        FROM client_companies 
        WHERE id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1)
        ORDER BY nome
    `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>;
  } else {
    // Client User sees only their companies
    companies = (await db.query(`
        SELECT c.id, c.nome, c.cnpj 
        FROM client_companies c 
        JOIN user_companies uc ON c.id = uc.company_id 
        WHERE uc.user_id = $1
        ORDER BY c.nome
    `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Solicitar Férias</h1>
        <p className="text-muted-foreground">
          Preencha os dados abaixo para iniciar o processo de solicitação de férias.
        </p>
      </div>
      
      <VacationForm companies={companies} />
    </div>
  );
}
