import { Metadata } from 'next';
import { IRForm } from '@/components/imposto-renda/ir-form';
import { getUserPermissions } from '@/app/actions/permissions';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Nova Declaração IR | VISION',
};

export default async function NovoImpostoRendaPage() {
  const permissions = await getUserPermissions();
  if (!permissions.includes('ir.create')) {
    redirect('/admin/pessoa-fisica/imposto-renda');
  }
  return (
    <div className="flex-1 p-4 md:p-8 pt-6">
      <IRForm />
    </div>
  );
}
