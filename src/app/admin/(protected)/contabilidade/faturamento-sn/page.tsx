import { getAccountants } from '@/app/actions/accountants';
import { FaturamentoSNWizard } from '@/components/contabilidade/FaturamentoSNWizard';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function FaturamentoSNPage() {
  const session = await getSession();
  const accountantsRaw = await getAccountants();
  
  // Serialize dates to avoid Next.js warnings
  const accountants = accountantsRaw.map((acc: any) => ({
    ...acc,
    created_at: acc.created_at ? new Date(acc.created_at).toISOString() : null,
    updated_at: acc.updated_at ? new Date(acc.updated_at).toISOString() : null,
    crc_date: acc.crc_date ? new Date(acc.crc_date).toISOString() : null,
  }));

  // Fetch all active companies for the wizard
  let companiesQuery = `
    SELECT id, razao_social, cnpj 
    FROM client_companies 
    WHERE is_active = 1 
  `;
  const companiesParams: any[] = [];

  if (session) {
    if (session.role === 'client_user') {
      companiesQuery += ` AND id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
      companiesParams.push(session.user_id);
    } else if (session.role === 'operator') {
      companiesQuery += ` AND id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?)`;
      companiesParams.push(session.user_id);
    }
  }

  companiesQuery += ` ORDER BY razao_social ASC`;

  const companies = await db.prepare(companiesQuery).all(...companiesParams) as Array<{ id: string; razao_social: string; cnpj: string }>;

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Faturamento SN</h1>
        <p className="text-muted-foreground">Emissão de demonstrativo de faturamento mensal para Simples Nacional (RPA Total).</p>
      </div>
      <FaturamentoSNWizard accountants={accountants} companies={companies} />
    </div>
  );
}