import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ExternalLink, Info } from 'lucide-react';

import { getUserPermissions } from '@/app/actions/permissions';
import { getQuestorZenEDocEmbedInfo } from '@/app/actions/integrations/questor-zen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EDocZenPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  const isAdmin = session.role === 'admin';
  const canAccess =
    isAdmin ||
    permissions.includes('edoc.view') ||
    permissions.includes('edoc.sent.view') ||
    permissions.includes('edoc.received.view');

  if (!canAccess) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Voce nao tem permissao para acessar a area integrada do e-Doc.</p>
      </div>
    );
  }

  const embedInfo = await getQuestorZenEDocEmbedInfo();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm text-slate-500">Inicio / e-Doc / Zen Integrado</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">e-Doc - Zen Integrado</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Teste de viabilidade para abrir a area central do e-Doc do Questor Zen dentro do Vision.
          </p>
        </div>

        {embedInfo.embedUrl && (
          <Button asChild className="bg-orange-500 text-white hover:bg-orange-600">
            <a href={embedInfo.embedUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir Zen em nova guia
            </a>
          </Button>
        )}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
            <Info className="h-4 w-4 text-orange-500" />
            Diagnostico de Incorporacao
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          {!embedInfo.success && (
            <p>{embedInfo.error || 'Nao foi possivel inspecionar o portal do Questor Zen.'}</p>
          )}

          {embedInfo.success && (
            <>
              <p>
                {embedInfo.likelyBlocked
                  ? 'Os headers do portal indicam que o iframe pode ser bloqueado pelo navegador.'
                  : 'Os headers do portal nao indicaram bloqueio imediato. O teste visual abaixo confirma se o iframe sera aceito.'}
              </p>
              <p>
                <span className="font-semibold text-slate-900">X-Frame-Options:</span>{' '}
                {embedInfo.xFrameOptions || 'nao informado'}
              </p>
              <p>
                <span className="font-semibold text-slate-900">frame-ancestors:</span>{' '}
                {embedInfo.frameAncestors || 'nao informado'}
              </p>
              {embedInfo.contentSecurityPolicy && (
                <p className="break-all text-xs text-slate-500">{embedInfo.contentSecurityPolicy}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {embedInfo.embedUrl ? (
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <iframe
              title="Questor Zen e-Doc"
              src={embedInfo.embedUrl}
              className="min-h-[78vh] w-full bg-white"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-8 text-sm text-slate-500">
            Configure a integracao do Questor Zen para testar a incorporacao dentro do Vision.
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button asChild variant="outline">
          <Link href="/admin/edoc">Voltar ao modulo</Link>
        </Button>
      </div>
    </div>
  );
}
