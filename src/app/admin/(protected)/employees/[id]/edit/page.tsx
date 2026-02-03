import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { EmployeeForm } from '@/components/admin/employees/employee-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEmployeePage({ params }: PageProps) {
  const { id } = await params;

  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id) as any;

  if (!employee) {
    notFound();
  }

  const companies = await db.prepare('SELECT id, nome, cnpj FROM client_companies WHERE is_active = 1 ORDER BY nome').all() as Array<{ id: string; nome: string; cnpj: string }>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Editar Funcionário</h1>
      </div>
      <EmployeeForm companies={companies} initialData={employee} />
    </div>
  );
}
