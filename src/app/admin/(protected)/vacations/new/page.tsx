import { VacationForm } from '@/components/vacations/vacation-form';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { getRolePermissions } from '@/app/actions/permissions';

export default async function NewVacationPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // Permission Check
  let hasPermission = false;
  if (session.role === 'admin') hasPermission = true;
  else {
      const permissions = await getRolePermissions(session.role);
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
  if (session.role === 'admin' || session.role === 'operator') {
    // Admin/Operator sees all companies
    companies = await db.prepare(`
        SELECT id, nome, cnpj FROM client_companies ORDER BY nome
    `).all() as Array<{ id: string; nome: string; cnpj: string }>;
  } else {
    // Client User sees only their companies
    companies = await db.prepare(`
        SELECT c.id, c.nome, c.cnpj 
        FROM client_companies c 
        JOIN user_companies uc ON c.id = uc.company_id 
        WHERE uc.user_id = ?
        ORDER BY c.nome
    `).all(session.user_id) as Array<{ id: string; nome: string; cnpj: string }>;
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
