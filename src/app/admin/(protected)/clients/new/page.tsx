import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
        <Link href="/admin/clients">
          <Button variant="outline" size="sm" className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Cadastrar Empresa</h1>
      </div>
      <CompanyForm />
    </div>
  );
}
