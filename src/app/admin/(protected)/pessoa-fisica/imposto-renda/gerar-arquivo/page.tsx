import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { IRDecMerge } from '@/components/imposto-renda/ir-dec-merge';

export const metadata: Metadata = {
  title: 'Gerar Arquivo IR | VISION',
};

export default async function GerarArquivoIRPage() {
  const permissions = await getUserPermissions();

  if (!permissions.includes('ir.view')) {
    redirect('/admin/pessoa-fisica/imposto-renda');
  }

  return (
    <div className="flex-1 p-4 md:p-8 pt-6">
      <IRDecMerge />
    </div>
  );
}
