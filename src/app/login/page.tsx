import db from '@/lib/db';
import { LoginForm } from '@/components/auth/login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
    const logoSetting = await db.prepare("SELECT value FROM settings WHERE key = 'SYSTEM_LOGO_PATH'").get() as { value: string } | undefined;
    
    return <LoginForm logoUrl={logoSetting?.value || null} />;
}
