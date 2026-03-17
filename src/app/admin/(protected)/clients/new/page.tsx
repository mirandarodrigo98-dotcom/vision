import { CompanyForm } from '@/components/admin/companies/company-form';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NewCompanyPage() {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) {
    redirect('/admin/dashboard');
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-2">
        <h1 className="text-3xl font-bold tracking-tight">Cadastrar Empresa</h1>
      </div>
      <CompanyForm />
    </div>
  );
}
