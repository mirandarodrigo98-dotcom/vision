import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReceiptText } from 'lucide-react';
import Link from 'next/link';

export default async function FiscalPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('fiscal.view')) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fiscal</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as rotinas e obrigações fiscais.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Simples Nacional
            </CardTitle>
            <CardDescription>
              Acesse a área de trabalho para gerenciar rotinas e faturamento do Simples Nacional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/fiscal/simples-nacional">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
