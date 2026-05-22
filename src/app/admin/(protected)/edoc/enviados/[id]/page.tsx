import { redirect } from 'next/navigation';

import { getEDocDocumentDetail } from '@/app/actions/edoc';
import { getUserPermissions } from '@/app/actions/permissions';
import { EDocDocumentDetailView } from '@/components/edoc/edoc-document-detail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type EDocSentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EDocSentDetailPage({ params }: EDocSentDetailPageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  const canView = session.role === 'admin' || permissions.includes('edoc.view') || permissions.includes('edoc.sent.view');

  if (!canView) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Voce nao tem permissao para acessar os detalhes dos documentos enviados.</p>
      </div>
    );
  }

  const { id } = await params;
  const result = await getEDocDocumentDetail(id, 'sent');

  if (!result.success || !result.detail) {
    return (
      <Card className="max-w-3xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Detalhes do Documento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            {result.error || 'Nao foi possivel carregar os detalhes do documento enviado no Questor Zen.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <EDocDocumentDetailView detail={result.detail} mode="sent" warning={result.error} />;
}
