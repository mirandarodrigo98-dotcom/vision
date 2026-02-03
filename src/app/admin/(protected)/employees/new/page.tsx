import db from '@/lib/db';
import { EmployeeForm } from '@/components/admin/employees/employee-form';

export default async function NewEmployeePage() {
  const companies = await db.prepare('SELECT id, nome, cnpj FROM client_companies WHERE is_active = 1 ORDER BY nome').all() as Array<{ id: string; nome: string; cnpj: string }>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Novo Funcionário</h1>
      </div>
      <EmployeeForm companies={companies} />
    </div>
  );
}
