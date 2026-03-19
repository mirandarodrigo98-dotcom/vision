import { getSystemLogoUrl } from '@/app/actions/upload-logo';
import { LoginForm } from '@/components/auth/login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
    const logoUrl = await getSystemLogoUrl();
    
    return <LoginForm logoUrl={logoUrl} />;
}
