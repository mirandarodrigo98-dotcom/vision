import { CompanyForm } from '@/components/admin/companies/company-form';

export default function NewCompanyPage() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-2">
        <h1 className="text-3xl font-bold tracking-tight">Cadastrar Empresa</h1>
      </div>
      <CompanyForm />
    </div>
  );
}
