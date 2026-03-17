import db from '@/lib/db';
import { EmployeeForm } from '@/components/admin/employees/employee-form';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NewEmployeePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  let companies = [];

  if (session.role === 'client_user') {
    companies = await db.prepare(`
      SELECT id, nome, cnpj 
      FROM client_companies 
      WHERE id IN (SELECT company_id FROM user_companies WHERE user_id = ?) 
      AND is_active = 1 
      ORDER BY nome
    `).all(session.user_id) as Array<{ id: string; nome: string; cnpj: string }>;
  } else if (session.role === 'operator') {
    companies = await db.prepare(`
      SELECT id, nome, cnpj 
      FROM client_companies 
      WHERE id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?) 
      AND is_active = 1 
      ORDER BY nome
    `).all(session.user_id) as Array<{ id: string; nome: string; cnpj: string }>;
  } else {
    // Admin
    companies = await db.prepare('SELECT id, nome, cnpj FROM client_companies WHERE is_active = 1 ORDER BY nome').all() as Array<{ id: string; nome: string; cnpj: string }>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Novo Funcionário</h1>
      </div>
      <EmployeeForm companies={companies} />
    </div>
  );
}
