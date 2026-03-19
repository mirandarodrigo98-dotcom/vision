import db from '@/lib/db';
import { SettingsForm } from './settings-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { getSystemLogoUrl } from '@/app/actions/upload-logo';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const emailSetting = await db.prepare('SELECT value FROM settings WHERE key = ?').get('NZD_DEST_EMAIL') as { value: string } | undefined;
  const logoUrl = await getSystemLogoUrl();

  const initialData = {
    email: emailSetting?.value || '',
    logoUrl: logoUrl,
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
       </div>
       <SettingsForm initialData={initialData} />
    </div>
  );
}
