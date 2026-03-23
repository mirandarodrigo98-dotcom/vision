import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getIRDeclarationById, getIRInteractions } from '@/app/actions/imposto-renda';
import { IRDetails } from '@/components/imposto-renda/ir-details';

export const metadata: Metadata = {
  title: 'Detalhes IR | VISION',
};

export default async function DetalhesImpostoRendaPage({ params }: { params: { id: string } }) {
  const declaration = await getIRDeclarationById(params.id);
  
  if (!declaration) {
    notFound();
  }

  const interactions = await getIRInteractions(params.id);

  return (
    <div className="flex-1 p-4 md:p-8 pt-6">
      <IRDetails declaration={declaration} interactions={interactions} />
    </div>
  );
}
