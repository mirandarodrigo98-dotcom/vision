'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Archive,
  CircleSlash,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  MailMinus,
  MessageSquare,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';

import { cancelEDocDocument, type EDocDocumentDetail } from '@/app/actions/edoc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type EDocDocumentDetailProps = {
  detail: EDocDocumentDetail;
  mode: 'sent' | 'received';
  warning?: string;
};

function getStatusClasses(statusGroup: EDocDocumentDetail['statusGroup']) {
  switch (statusGroup) {
    case 'archived':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    case 'canceled':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm text-slate-800">{value || '--'}</p>
    </div>
  );
}

export function EDocDocumentDetailView({ detail, mode, warning }: EDocDocumentDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const backPath = mode === 'sent' ? '/admin/edoc/enviados' : '/admin/edoc/recebidos';
  const primaryAttachment = detail.attachments[0];

  function handleCancel() {
    startTransition(() => {
      void cancelEDocDocument(detail.id).then((result) => {
        if (!result.success) {
          toast.error(result.error || 'Nao foi possivel cancelar o documento.');
          return;
        }

        toast.success(result.message || 'Documento cancelado com sucesso.');
        router.refresh();
      });
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-slate-500">Inicio / e-Doc / Detalhes do Documento</p>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {detail.code && (
                <span className="rounded bg-[#3b82c4] px-2 py-1 text-xs font-semibold text-white">
                  {detail.code}
                </span>
              )}
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{detail.title}</h1>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Documento {mode === 'sent' ? 'enviado' : 'recebido'} no Questor Zen e exibido no Vision.
            </p>
          </div>
          <Badge variant="outline" className={cn('self-start', getStatusClasses(detail.statusGroup))}>
            {detail.status}
          </Badge>
        </div>
      </div>

      {warning && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{warning}</span>
          </div>
        </div>
      )}

      {detail.source === 'api-fallback' && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Alguns blocos da tela usam apenas os dados expostos pela API/listagem do Zen. Quando o portal do Questor Zen
          responder com as credenciais salvas no Meu Perfil do usuário logado, o painel passa a preencher mais
          informações automaticamente.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.9fr_0.9fr]">
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <DetailField label="Id" value={detail.id} />
                <DetailField label="Tipo" value={detail.type} />
                <DetailField label="Competencia" value={detail.competence} />
                <DetailField label="Colaborador" value={detail.collaborator} />
                <DetailField label="Cliente" value={detail.companyName} />
                <DetailField label="Documento Cliente" value={detail.companyDocument} />
                <DetailField label="Autor" value={detail.author} />
                <DetailField label="Comentarios" value={String(detail.commentsCount)} />
                <DetailField label="Data Criacao" value={detail.createdAt} />
                <DetailField label="Data Envio" value={detail.sentAt} />
                <DetailField label="Vencimento" value={detail.dueAt} />
                <DetailField label="Origem" value={detail.origin} />
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Observacao</p>
                <p className="whitespace-pre-wrap text-sm text-slate-800">{detail.observation || '--'}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <Button type="button" variant="outline" disabled>
              <Eye className="mr-2 h-4 w-4" />
              Visualizar detalhes
            </Button>

            {primaryAttachment ? (
              <Button asChild type="button" variant="outline">
                <a
                  href={`/api/edoc/download?fileId=${encodeURIComponent(primaryAttachment.id)}&name=${encodeURIComponent(primaryAttachment.name)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}

            <Button type="button" variant="outline" disabled>
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar
            </Button>

            <Button type="button" variant="outline" disabled>
              <MailMinus className="mr-2 h-4 w-4" />
              Remover E-mail
            </Button>

            <Button type="button" variant="outline" disabled>
              <Archive className="mr-2 h-4 w-4" />
              Arquivar
            </Button>

            <Button type="button" variant="outline" disabled>
              <MessageSquare className="mr-2 h-4 w-4" />
              Arquivar com mensagem
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={detail.statusGroup === 'canceled' || isPending}
              onClick={handleCancel}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CircleSlash className="mr-2 h-4 w-4" />}
              Cancelar
            </Button>

            <Button asChild type="button" variant="outline">
              <Link href={backPath}>Voltar</Link>
            </Button>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Arquivos</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.attachments.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum arquivo exposto pelo Zen para este documento.</p>
              ) : (
                <div className="space-y-2">
                  {detail.attachments.map((attachment) => (
                    <a
                      key={`${attachment.id}-${attachment.name}`}
                      href={`/api/edoc/download?fileId=${encodeURIComponent(attachment.id)}&name=${encodeURIComponent(attachment.name)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded border border-slate-200 px-3 py-2 text-sm text-slate-700 transition-colors hover:border-orange-300 hover:text-orange-600"
                    >
                      {attachment.name}
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Movimentacoes</CardTitle>
            {detail.portalUrl && (
              <Button asChild type="button" size="sm" variant="ghost">
                <a href={detail.portalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Zen
                </a>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {detail.movements.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma movimentacao retornada pelo Questor Zen.</p>
            ) : (
              <div className="space-y-3">
                {detail.movements.map((movement, index) => (
                  <div key={`${movement.title}-${movement.time}-${index}`} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{movement.title}</p>
                        <p className="mt-1 text-xs text-slate-600">{movement.description}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-slate-500">{movement.time || '--'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
