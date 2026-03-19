import { getAccountants } from '@/app/actions/accountants';
import { FaturamentoSNWizard } from '@/components/contabilidade/FaturamentoSNWizard';

export const dynamic = 'force-dynamic';

export default async function FaturamentoSNPage() {
  const accountantsRaw = await getAccountants();
  
  // Serialize dates to avoid Next.js warnings
  const accountants = accountantsRaw.map((acc: any) => ({
    ...acc,
    created_at: acc.created_at ? new Date(acc.created_at).toISOString() : null,
    updated_at: acc.updated_at ? new Date(acc.updated_at).toISOString() : null,
    crc_date: acc.crc_date ? new Date(acc.crc_date).toISOString() : null,
  }));

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Faturamento SN</h1>
        <p className="text-muted-foreground">Emissão de demonstrativo de faturamento mensal para Simples Nacional (RPA Total).</p>
      </div>
      <FaturamentoSNWizard accountants={accountants} />
    </div>
  );
}