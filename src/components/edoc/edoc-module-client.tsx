'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, FilePlus2, Inbox, Send } from 'lucide-react';

import type { EDocCreateModule } from '@/app/actions/edoc';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type EDocModuleClientProps = {
  catalog: EDocCreateModule[];
  canViewSent: boolean;
  canViewReceived: boolean;
  canCreate: boolean;
};

export function EDocModuleClient({
  catalog,
  canViewSent,
  canViewReceived,
  canCreate,
}: EDocModuleClientProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedModuleId, setSelectedModuleId] = React.useState('');
  const [selectedCategoryId, setSelectedCategoryId] = React.useState('');

  const selectedModule = React.useMemo(
    () => catalog.find((module) => module.id === selectedModuleId) || null,
    [catalog, selectedModuleId]
  );

  const cards = [
    {
      href: '/admin/edoc/enviados',
      label: 'Enviados',
      description: 'Consulte e acompanhe os documentos publicados para os clientes via Questor Zen.',
      icon: Send,
      enabled: canViewSent,
      action: 'link' as const,
    },
    {
      href: '/admin/edoc/recebidos',
      label: 'Recebidos',
      description: 'Consulte os documentos enviados pelos clientes ao escritorio usando os tipos retornados pela API.',
      icon: Inbox,
      enabled: canViewReceived,
      action: 'link' as const,
    },
    {
      href: '/admin/edoc/cadastrar',
      label: 'Cadastrar',
      description: 'Selecione categoria e documento em um popup antes de abrir o formulario dinamico de envio.',
      icon: FilePlus2,
      enabled: canCreate,
      action: 'dialog' as const,
    },
  ];

  function handleOpenCreateDialog() {
    setSelectedModuleId('');
    setSelectedCategoryId('');
    setDialogOpen(true);
  }

  function handleGoToCreateForm() {
    if (!selectedCategoryId) return;
    setDialogOpen(false);
    router.push(`/admin/edoc/cadastrar?categoryId=${encodeURIComponent(selectedCategoryId)}`);
  }

  return (
    <>
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

            if (card.action === 'dialog') {
              return (
                <button key={card.label} type="button" className="group text-left" onClick={handleOpenCreateDialog}>
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
                </button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#2563eb]">Cadastrar Documento</DialogTitle>
            <DialogDescription>
              Selecione primeiro a categoria e o tipo do documento para abrir o formulario correto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={selectedModuleId}
                onValueChange={(value) => {
                  setSelectedModuleId(value);
                  setSelectedCategoryId('');
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Documento</Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId} disabled={!selectedModule}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={selectedModule ? 'Selecione' : 'Selecione a categoria primeiro'} />
                </SelectTrigger>
                <SelectContent>
                  {(selectedModule?.categories || [])
                    .filter((category) => !category.deadFile)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              className="bg-[#3b82c4] hover:bg-[#326fa6]"
              onClick={handleGoToCreateForm}
              disabled={!selectedCategoryId}
            >
              Selecionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
