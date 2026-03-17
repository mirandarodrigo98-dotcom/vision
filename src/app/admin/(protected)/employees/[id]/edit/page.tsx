import { notFound, redirect } from 'next/navigation';
import db from '@/lib/db';
import { EmployeeForm } from '@/components/admin/employees/employee-form';
import { addDays, parseISO, format } from 'date-fns';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;

  let employeeQuery = 'SELECT * FROM employees WHERE id = ?';
  const queryParams: any[] = [id];

  if (session.role === 'client_user') {
    employeeQuery += ' AND company_id IN (SELECT company_id FROM user_companies WHERE user_id = ?)';
    queryParams.push(session.user_id);
  } else if (session.role === 'operator') {
    employeeQuery += ' AND (company_id IS NULL OR company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?))';
    queryParams.push(session.user_id);
  }

  const employee = await db.prepare(employeeQuery).get(...queryParams) as any;

  if (!employee) {
    notFound();
  }

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

  const vacations = await db.prepare(`
    SELECT * FROM vacations 
    WHERE employee_id = ? AND status != 'CANCELLED' 
    ORDER BY start_date DESC
  `).all(id) as any[];

  const leaves = await db.prepare(`
    SELECT * FROM leaves 
    WHERE employee_id = ? AND status != 'CANCELLED' 
    ORDER BY start_date DESC
  `).all(id) as any[];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Editar Funcionário</h1>
      </div>
      <EmployeeForm 
        companies={companies} 
        initialData={employee} 
        vacations={vacations.map(v => {
          const startDate = parseISO(v.start_date);
          const endDate = addDays(startDate, (v.days_quantity || 1) - 1);
          return {
            ...v, 
            days: v.days_quantity,
            end_date: format(endDate, 'yyyy-MM-dd')
          };
        })}
        leaves={leaves.map(l => ({...l, type: l.leave_type}))}
      />
    </div>
  );
}
