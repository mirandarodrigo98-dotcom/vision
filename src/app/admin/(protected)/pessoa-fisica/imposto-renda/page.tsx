import { Metadata } from 'next';
import { getIRDeclarations } from '@/app/actions/imposto-renda';
import { getUserPermissions } from '@/app/actions/permissions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileCog, PlusIcon } from 'lucide-react';
import { PartnersDialog } from '@/components/imposto-renda/partners-dialog';
import { IROverview } from '@/components/imposto-renda/ir-overview';

export const metadata: Metadata = {
  title: 'Imposto de Renda | VISION',
};

export const dynamic = 'force-dynamic';

export default async function ImpostoRendaPage() {
  const permissions = await getUserPermissions();
  if (!permissions.includes('ir.view')) {
    redirect('/admin');
  }
  
  const declarations = await getIRDeclarations();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Imposto de Renda</h2>
        <div className="flex gap-2">
          <PartnersDialog />
          <Link href="/admin/pessoa-fisica/imposto-renda/gerar-arquivo">
            <Button variant="outline">
              <FileCog className="h-4 w-4 mr-2" />
              Gerar Arquivo IR
            </Button>
          </Link>
          <Link href="/admin/pessoa-fisica/imposto-renda/novo">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Nova Declaração
            </Button>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <IROverview declarations={declarations} />
      </div>
    </div>
  );
}
