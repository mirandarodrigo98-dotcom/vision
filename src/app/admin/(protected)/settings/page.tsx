import db from '@/lib/db';
import { SettingsForm } from './settings-form';

export default async function SettingsPage() {
  const emailSetting = await db.prepare('SELECT value FROM settings WHERE key = ?').get('NZD_DEST_EMAIL') as { value: string } | undefined;
  const subjectSetting = await db.prepare('SELECT value FROM settings WHERE key = ?').get('EMAIL_SUBJECT') as { value: string } | undefined;
  const bodySetting = await db.prepare('SELECT value FROM settings WHERE key = ?').get('EMAIL_BODY') as { value: string } | undefined;

  const initialData = {
    email: emailSetting?.value || '',
    subject: subjectSetting?.value || '',
    body: bodySetting?.value || '',
  };

  return (
    <div className="space-y-6">
       <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
       <SettingsForm initialData={initialData} />
    </div>
  );
}
