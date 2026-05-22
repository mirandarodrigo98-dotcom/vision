import Link from 'next/link';
import { ArrowRightIcon, FilePlus2, Inbox, Send } from 'lucide-react';
import { redirect } from 'next/navigation';

import { getUserPermissions } from '@/app/actions/permissions';
import { getSession } from '@/lib/auth';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EDocPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  const isAdmin = session.role === 'admin';
  const canViewSent = isAdmin || permissions.includes('edoc.view') || permissions.includes('edoc.sent.view');
  const canViewReceived = isAdmin || permissions.includes('edoc.view') || permissions.includes('edoc.received.view');
  const canCreate = isAdmin || permissions.includes('edoc.view') || permissions.includes('edoc.create');

  if (!canViewSent && !canViewReceived && !canCreate) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Voce nao tem permissao para acessar este modulo.</p>
      </div>
    );
  }

  const cards = [
    {
      href: '/admin/edoc/enviados',
      label: 'Enviados',
      description: 'Consulte e acompanhe os documentos publicados para os clientes via Questor Zen.',
      icon: Send,
      enabled: canViewSent,
    },
    {
      href: '/admin/edoc/recebidos',
      label: 'Recebidos',
      description: 'Area reservada para a tela de documentos recebidos do e-Doc.',
      icon: Inbox,
      enabled: canViewReceived,
    },
    {
      href: '/admin/edoc/cadastrar',
      label: 'Cadastrar',
      description: 'Preparacao da rotina de publicacao/envio de documentos pelo Vision.',
      icon: FilePlus2,
      enabled: canCreate,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">e-Doc</h1>
        <p className="mt-2 text-muted-foreground">
          Frontend do Vision para os documentos do Questor Zen no painel admin/operador.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          if (!card.enabled) {
            return (
              <Card key={card.label} className="cursor-not-allowed border-dashed opacity-60">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-slate-500">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {card.label}
                    </div>
                  </CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          }

          return (
            <Link key={card.href} href={card.href} className="group">
              <Card className="h-full cursor-pointer transition-all hover:border-[#f97316] hover:shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 transition-colors group-hover:text-[#f97316]">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {card.label}
                    </div>
                    <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
