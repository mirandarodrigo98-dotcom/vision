import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getDigisacConfig } from '@/app/actions/integrations/digisac';
import { DigisacConfigForm } from '@/components/integrations/digisac/digisac-config-form';

export default async function DigisacIntegrationPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const config = await getDigisacConfig();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Integração Digisac</h1>
      <DigisacConfigForm initialConfig={config} />
    </div>
  );
}
