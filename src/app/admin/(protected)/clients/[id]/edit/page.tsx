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

  const initialSocios = await db.prepare(`
    SELECT scs.participacao_percent,
           ss.id as socio_id,
           ss.nome,
           ss.cpf,
           ss.data_nascimento,
           ss.rg,
           ss.cnh,
           ss.cep,
           ss.logradouro_tipo,
           ss.logradouro,
           ss.numero,
           ss.complemento,
           ss.bairro,
           ss.municipio,
           ss.uf
    FROM societario_company_socios scs
    JOIN societario_socios ss ON ss.id = scs.socio_id
    WHERE scs.company_id = ?
    ORDER BY ss.nome ASC
  `).all(id) as any[];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-2">
        <h1 className="text-3xl font-bold tracking-tight">Editar Empresa</h1>
      </div>
      <CompanyForm company={company} hasLinkedRecords={!!hasLinkedRecords} initialSocios={initialSocios} />
    </div>
  );
}
