import { getAccountants } from '@/app/actions/accountants';
import { FaturamentoWizard } from '@/components/contabilidade/FaturamentoWizard';
import db from '@/lib/db';

export default async function FaturamentoPage() {
  const accountantsRaw = await getAccountants();
  
  // Serialize dates to avoid Next.js warnings
  const accountants = accountantsRaw.map((acc: any) => ({
    ...acc,
    created_at: acc.created_at ? new Date(acc.created_at).toISOString() : null,
    updated_at: acc.updated_at ? new Date(acc.updated_at).toISOString() : null,
    crc_date: acc.crc_date ? new Date(acc.crc_date).toISOString() : null,
  }));

  // Fetch all active companies for the wizard
  const companies = await db.prepare(`
    SELECT id, razao_social, cnpj 
    FROM client_companies 
    WHERE is_active = 1 
    ORDER BY razao_social ASC
  `).all() as Array<{ id: string; razao_social: string; cnpj: string }>;

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Faturamento</h1>
        <p className="text-muted-foreground">Emissão de demonstrativo de faturamento mensal.</p>
      </div>
      <FaturamentoWizard accountants={accountants} companies={companies} />
    </div>
  );
}
