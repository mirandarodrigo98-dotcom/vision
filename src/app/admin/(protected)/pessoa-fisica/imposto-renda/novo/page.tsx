import { Metadata } from 'next';
import { IRForm } from '@/components/imposto-renda/ir-form';

export const metadata: Metadata = {
  title: 'Nova Declaração IR | VISION',
};

export default function NovoImpostoRendaPage() {
  return (
    <div className="flex-1 p-4 md:p-8 pt-6">
      <IRForm />
    </div>
  );
}
