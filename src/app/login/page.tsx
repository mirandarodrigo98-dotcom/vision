import { getSystemLogoUrl } from '@/app/actions/upload-logo';
import { LoginForm } from '@/components/auth/login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
    const logoUrl = await getSystemLogoUrl();
    
    // Teste para ver se é o logoUrl causando problema:
    // se o getSystemLogoUrl() falhar ou algo do tipo, ele já foi resolvido com try/catch.
    
    return <LoginForm logoUrl={logoUrl} />;
}
