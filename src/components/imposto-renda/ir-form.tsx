'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createIRDeclaration } from '@/app/actions/imposto-renda';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

// Usar o seletor de empresa existente nos tickets
import { TicketCompanySelector } from '@/components/tickets/ticket-company-selector';

export function IRForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'Sócio' | 'Particular'>('Particular');
  const [companyId, setCompanyId] = useState<string>('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const data = {
        name: formData.get('name') as string,
        year: formData.get('year') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        type,
        company_id: type === 'Sócio' ? companyId : undefined,
      };

      if (type === 'Sócio' && !companyId) {
        toast.error('Selecione uma empresa para o sócio.');
        setLoading(false);
        return;
      }

      await createIRDeclaration(data);
      toast.success('Declaração incluída com sucesso!');
      router.push('/admin/pessoa-fisica/imposto-renda');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao incluir declaração.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/admin/pessoa-fisica/imposto-renda">
            <Button variant="ghost" size="icon">
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
          <CardTitle>Nova Declaração de Imposto de Renda</CardTitle>
        </div>
        <CardDescription>
          Preencha os dados do contribuinte para iniciar o acompanhamento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Contribuinte</Label>
            <Input id="name" name="name" required placeholder="Ex: João da Silva" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Exercício</Label>
              <Input id="year" name="year" required placeholder="Ex: 2026" defaultValue={new Date().getFullYear().toString()} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" required placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required placeholder="joao@exemplo.com" />
          </div>

          <div className="space-y-3">
            <Label>Tipo de Contribuinte</Label>
            <div className="flex flex-col space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="type_radio"
                  value="Particular"
                  checked={type === 'Particular'}
                  onChange={() => setType('Particular')}
                  className="h-4 w-4 text-primary"
                />
                <span>Particular</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="type_radio"
                  value="Sócio"
                  checked={type === 'Sócio'}
                  onChange={() => setType('Sócio')}
                  className="h-4 w-4 text-primary"
                />
                <span>Sócio</span>
              </label>
            </div>
          </div>

          {type === 'Sócio' && (
            <div className="space-y-2 border p-4 rounded-md bg-muted/30">
              <Label>Empresa Vinculada</Label>
              <TicketCompanySelector
                value={companyId}
                onSelect={setCompanyId}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ao selecionar a empresa, os dados básicos poderão ser consultados posteriormente.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Link href="/admin/pessoa-fisica/imposto-renda">
              <Button variant="outline" type="button">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar e Iniciar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
