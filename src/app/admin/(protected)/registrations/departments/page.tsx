
import { getDepartments } from '@/app/actions/departments';
import { DepartmentList } from './department-list';

export default async function DepartmentsPage() {
  const { data: departments, error } = await getDepartments();

  if (error) {
    return <div className="p-6 text-red-500">Erro ao carregar departamentos: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <DepartmentList departments={departments || []} />
    </div>
  );
}
