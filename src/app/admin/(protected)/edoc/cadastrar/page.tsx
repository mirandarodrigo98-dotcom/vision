import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getUserPermissions } from '@/app/actions/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function EDocCreatePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  const canView = session.role === 'admin' || permissions.includes('edoc.view') || permissions.includes('edoc.create');

  if (!canView) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Voce nao tem permissao para acessar o cadastro de documentos.</p>
      </div>
    );
  }

  return (
    <Card className="max-w-3xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle>e-Doc - Cadastrar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          A rotina de cadastro/envio de documentos pelo Vision sera construida na proxima etapa, depois da
          aprovacao da tela de <strong>Documentos Enviados</strong>.
        </p>
        <Link href="/admin/edoc">
          <Button variant="outline">Voltar ao modulo e-Doc</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
