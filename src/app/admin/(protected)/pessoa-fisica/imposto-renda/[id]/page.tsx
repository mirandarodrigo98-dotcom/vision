import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getIRDeclarationById, getIRInteractions } from '@/app/actions/imposto-renda';
import { getUserPermissions } from '@/app/actions/permissions';
import { redirect } from 'next/navigation';
import { IRDetails } from '@/components/imposto-renda/ir-details';

export const metadata: Metadata = {
  title: 'Detalhes IR | VISION',
};

export default async function DetalhesImpostoRendaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const permissions = await getUserPermissions();
  if (!permissions.includes('ir.details.view')) {
    redirect('/admin/pessoa-fisica/imposto-renda');
  }
  const declaration = await getIRDeclarationById(id);
  
  if (!declaration) {
    notFound();
  }

  const interactions = await getIRInteractions(id);

  return (
    <div className="flex-1 p-4 md:p-8 pt-6">
      <IRDetails declaration={declaration} interactions={interactions} />
    </div>
  );
}
