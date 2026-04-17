'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, HelpCircle, ArrowUpDown } from 'lucide-react';
import { PlanoContas } from './plano-contas';

export function CarneLeaoManager() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('rendimentos');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'pagamentos') {
      setActiveTab('pagamentos');
    }
  }, [searchParams]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
        <TabsTrigger value="rendimentos">Rendimentos</TabsTrigger>
        <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
        <TabsTrigger value="plano-contas">Plano de Contas</TabsTrigger>
      </TabsList>

      <TabsContent value="rendimentos" className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b mb-4">
            <CardTitle className="text-2xl font-normal">Rendimentos</CardTitle>
            <div className="flex items-center gap-2">
              <Link href="/admin/pessoa-fisica/carne-leao/novo-rendimento">
                <Button className="bg-[#1b5fcc] hover:bg-[#154ca3] text-white rounded-full px-6">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  RENDIMENTO
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="rounded-full text-[#1b5fcc] hover:text-[#154ca3] hover:bg-blue-50">
                <HelpCircle className="h-6 w-6" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 mb-12">
              <div className="flex items-center text-sm text-muted-foreground mr-2 font-medium">
                Filtrar por <ArrowUpDown className="ml-2 h-4 w-4" /> <span className="mx-2">|</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Input type="date" className="w-[150px]" placeholder="Data inicial" />
                <span className="text-sm">a</span>
                <Input type="date" className="w-[150px]" placeholder="Data final" />
              </div>

              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Recebido de" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pf">Pessoa Física</SelectItem>
                  <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>

              <Input placeholder="CPF/CNPJ" className="w-[180px]" />

              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Natureza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="alugueis">Aluguéis</SelectItem>
                  <SelectItem value="trabalho_nao_assalariado">Trabalho Não Assalariado</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-center py-12 text-muted-foreground">
              Nenhum resultado encontrado
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pagamentos" className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b mb-4">
            <CardTitle className="text-2xl font-normal">Pagamentos</CardTitle>
            <div className="flex items-center gap-2">
              <Link href="/admin/pessoa-fisica/carne-leao/novo-pagamento">
                <Button className="bg-[#1b5fcc] hover:bg-[#154ca3] text-white rounded-full px-6">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  PAGAMENTO
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="rounded-full text-[#1b5fcc] hover:text-[#154ca3] hover:bg-blue-50">
                <HelpCircle className="h-6 w-6" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 mb-12">
              <div className="flex items-center text-sm text-muted-foreground mr-2 font-medium">
                Filtrar por <ArrowUpDown className="ml-2 h-4 w-4" /> <span className="mx-2">|</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Input type="date" className="w-[150px]" placeholder="Data inicial" />
                <span className="text-sm">a</span>
                <Input type="date" className="w-[150px]" placeholder="Data final" />
              </div>

              <Select>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Natureza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="saude">Saúde</SelectItem>
                  <SelectItem value="educacao">Educação</SelectItem>
                  <SelectItem value="previdencia">Previdência</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-center py-12 text-muted-foreground">
              Nenhum resultado encontrado
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="plano-contas" className="mt-6">
        <PlanoContas />
      </TabsContent>
    </Tabs>
  );
}