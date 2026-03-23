import { Metadata } from 'next';
import { getIRDeclarations, getIRStats } from '@/app/actions/imposto-renda';
import { IRDashboard } from '@/components/imposto-renda/ir-dashboard';
import { IRGrid } from '@/components/imposto-renda/ir-grid';

export const metadata: Metadata = {
  title: 'Imposto de Renda | VISION',
};

export const dynamic = 'force-dynamic';

export default async function ImpostoRendaPage() {
  const declarations = await getIRDeclarations();
  const stats = await getIRStats();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Imposto de Renda</h2>
      </div>

      <div className="space-y-4">
        <IRDashboard stats={stats} />
        <IRGrid declarations={declarations} />
      </div>
    </div>
  );
}
