import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { EmployeeForm } from '@/components/admin/employees/employee-form';
import { addDays, parseISO, format } from 'date-fns';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ViewEmployeePage({ params }: PageProps) {
  const { id } = await params;

  const employee = await db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any;

  if (!employee) {
    notFound();
  }

  const companies = await db.prepare('SELECT id, nome, cnpj FROM client_companies WHERE is_active = 1 ORDER BY nome').all() as Array<{ id: string; nome: string; cnpj: string }>;

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
        <h1 className="text-3xl font-bold tracking-tight">Visualizar Funcionário</h1>
      </div>
      <EmployeeForm 
        companies={companies} 
        initialData={employee} 
        readOnly={true} 
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
