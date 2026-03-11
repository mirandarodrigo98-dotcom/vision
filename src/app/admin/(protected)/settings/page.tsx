import db from '@/lib/db';
import { SettingsForm } from './settings-form';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CalendarClock } from 'lucide-react';

export default async function SettingsPage() {
  const emailSetting = await db.prepare('SELECT value FROM settings WHERE key = ?').get('NZD_DEST_EMAIL') as { value: string } | undefined;
  const logoSetting = await db.prepare('SELECT value FROM settings WHERE key = ?').get('SYSTEM_LOGO_PATH') as { value: string } | undefined;

  const initialData = {
    email: emailSetting?.value || '',
    logoUrl: logoSetting?.value || null,
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
         <Link href="/admin/settings/access-schedules">
           <Button variant="outline" className="gap-2">
             <CalendarClock className="h-4 w-4" />
             Tabela de Horários
           </Button>
         </Link>
       </div>
       <SettingsForm initialData={initialData} />
    </div>
  );
}
