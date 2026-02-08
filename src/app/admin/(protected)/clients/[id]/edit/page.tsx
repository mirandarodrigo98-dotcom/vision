import db from '@/lib/db';
import { CompanyForm } from '@/components/admin/companies/company-form';
import { notFound } from 'next/navigation';

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await db.prepare('SELECT * FROM client_companies WHERE id = ?').get(id) as any;

  if (!company) {
    notFound();
  }

  // Check for linked records
  const hasLinkedRecords = await db.prepare(`
    SELECT 1 FROM employees WHERE company_id = ?
    UNION SELECT 1 FROM admission_requests WHERE company_id = ?
    UNION SELECT 1 FROM user_companies WHERE company_id = ?
    LIMIT 1
  `).get(id, id, id);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-2">
        <h1 className="text-3xl font-bold tracking-tight">Editar Empresa</h1>
      </div>
      <CompanyForm company={company} hasLinkedRecords={!!hasLinkedRecords} />
    </div>
  );
}
