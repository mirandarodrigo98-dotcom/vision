import db from '@/lib/db';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const emailSetting = await db.prepare('SELECT value FROM settings WHERE key = ?').get('NZD_DEST_EMAIL') as { value: string } | undefined;
  const logoSetting = await db.prepare('SELECT value FROM settings WHERE key = ?').get('SYSTEM_LOGO_PATH') as { value: string } | undefined;

  const initialData = {
    email: emailSetting?.value || '',
    logoUrl: logoSetting?.value || null,
  };

  return (
    <div className="space-y-6">
       <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
       <SettingsForm initialData={initialData} />
    </div>
  );
}
