import db from '@/lib/db';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompanyForm } from '@/components/admin/companies/company-form';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;
  
  let companyQuery = `SELECT * FROM client_companies WHERE id = $1`;
  const queryParams: any[] = [id];

  if (session.role === 'operator') {
    companyQuery += ` AND id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1)`;
    queryParams.push(session.user_id);
  } else if (session.role === 'client_user') {
    // Usually client_users don't edit companies, but for completeness
    companyQuery += ` AND id IN (SELECT company_id FROM user_companies WHERE user_id = $1)`;
    queryParams.push(session.user_id);
  }

  const company = (await db.query(companyQuery, [...queryParams])).rows[0] as any;

  if (!company) {
    notFound();
  }

  // Check for linked records
  const hasLinkedRecords = (await db.query(`
    SELECT 1 FROM employees WHERE company_id = $1
    UNION SELECT 1 FROM admission_requests WHERE company_id = $2
    UNION SELECT 1 FROM user_companies WHERE company_id = $3
    LIMIT 1
  `, [id, id, id])).rows[0];

  const initialSocios = (await db.query(`
    SELECT scs.participacao_percent,
           ss.id,
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
           ss.uf,
           scs.is_representative
    FROM societario_company_socios scs
    JOIN societario_socios ss ON ss.id = scs.socio_id
    WHERE scs.company_id = $1
    ORDER BY ss.nome ASC
  `, [id])).rows as any[];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-2">
        <Link href="/admin/clients">
          <Button variant="outline" size="sm" className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Editar Empresa: {company.razao_social || company.nome}</h1>
      </div>
      <CompanyForm company={company} hasLinkedRecords={!!hasLinkedRecords} initialSocios={initialSocios} />
    </div>
  );
}
