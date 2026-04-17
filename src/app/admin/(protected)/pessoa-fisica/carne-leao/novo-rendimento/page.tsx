'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export default function NovoRendimentoPage() {
  const [valor, setValor] = useState('R$ 0,00');

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/pessoa-fisica/carne-leao">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-[#1b5fcc] text-white hover:bg-[#154ca3] hover:text-white border-0">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h2 className="text-3xl font-normal text-foreground tracking-tight">Rendimento</h2>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full text-[#1b5fcc] hover:text-[#154ca3] hover:bg-blue-50">
          <HelpCircle className="h-6 w-6" />
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-gray-200">
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-[#1b5fcc] font-semibold text-sm">Natureza</Label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar Rendimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trabalho">Trabalho Não Assalariado</SelectItem>
                  <SelectItem value="alugueis">Aluguéis</SelectItem>
                  <SelectItem value="exterior">Rendimentos do Exterior</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#1b5fcc] font-semibold text-sm">Data do Recebimento</Label>
              <Input type="date" className="w-full max-w-[200px]" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[#1b5fcc] font-semibold text-sm">Histórico</Label>
                <Textarea 
                  placeholder="Informe um texto com até 255 caracteres" 
                  maxLength={255}
                  className="resize-none h-20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1b5fcc] font-semibold text-sm">Valor</Label>
                <Input 
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full max-w-[200px] text-right" 
                />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full h-12 bg-[#e2e8f0] text-slate-400 hover:bg-slate-300 font-semibold rounded-lg" disabled>
            INCLUIR RENDIMENTO
          </Button>
        </div>
      </div>
    </div>
  );
}