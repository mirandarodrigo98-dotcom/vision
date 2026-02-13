
import { getSession } from '@/lib/auth';
import { getRolePermissions } from '@/app/actions/permissions';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default async function IntegrationsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getRolePermissions(session.role);

  if (!permissions.includes('integrations.view')) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
            <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
            <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
        </div>
      );
  }
  
  const canAccessEnuves = permissions.includes('integrations.enuves');
  const canAccessEklesia = permissions.includes('integrations.eklesia');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Integrações</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
             <CardTitle>Contabilidade</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
             {canAccessEnuves ? (
                <Link href="/admin/integrations/enuves" className="w-full">
                    <Button className="w-full">
                        ENUVES
                    </Button>
                </Link>
             ) : (
                <Button className="w-full" variant="outline" disabled>
                    ENUVES
                </Button>
             )}

             <Button 
                className="w-full"
                variant={canAccessEklesia ? "default" : "outline"}
                disabled={!canAccessEklesia}
             >
                EKLESIA
             </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
