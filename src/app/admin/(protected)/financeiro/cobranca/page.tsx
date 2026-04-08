'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CurrencyDollarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { listarContasReceber } from '@/app/actions/integrations/omie';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CobrancaPage() {
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [loading, setLoading] = useState(false);
  const [contas, setContas] = useState<any[]>([]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataDe || !dataAte) {
      toast.error('Preencha as datas de início e fim.');
      return;
    }

    setLoading(true);
    try {
      // O input date nativo retorna YYYY-MM-DD. O Omie exige DD/MM/YYYY.
      const deParts = dataDe.split('-');
      const ateParts = dataAte.split('-');
      const formattedDe = `${deParts[2]}/${deParts[1]}/${deParts[0]}`;
      const formattedAte = `${ateParts[2]}/${ateParts[1]}/${ateParts[0]}`;

      const response = await listarContasReceber(formattedDe, formattedAte);
      
      if (response.error) {
        toast.error(response.error);
        return;
      }

      setContas(response.data || []);
      toast.success(`${(response.data || []).length} registros encontrados.`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar dados no Omie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
          <CurrencyDollarIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas a Receber (Omie)</h1>
          <p className="text-muted-foreground">Consulte boletos, recebimentos e inadimplência integrados via Omie ERP</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtro por Período</CardTitle>
          <CardDescription>Informe o período de Data de Emissão para buscar os lançamentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-end gap-4">
            <div className="grid w-full md:w-auto items-center gap-1.5">
              <Label htmlFor="dataDe">Data de Emissão (De)</Label>
              <Input 
                type="date" 
                id="dataDe" 
                value={dataDe} 
                onChange={(e) => setDataDe(e.target.value)} 
                required 
              />
            </div>
            <div className="grid w-full md:w-auto items-center gap-1.5">
              <Label htmlFor="dataAte">Data de Emissão (Até)</Label>
              <Input 
                type="date" 
                id="dataAte" 
                value={dataAte} 
                onChange={(e) => setDataAte(e.target.value)} 
                required 
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full md:w-auto">
              {loading ? 'Buscando...' : (
                <>
                  <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                  Buscar no Omie
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>Lista de contas a receber do período selecionado.</CardDescription>
        </CardHeader>
        <CardContent>
          {contas.length === 0 && !loading ? (
            <div className="text-center p-8 text-muted-foreground border rounded-lg bg-secondary/20">
              Nenhum registro encontrado. Realize uma busca.
            </div>
          ) : (
            <ScrollArea className="h-[500px] w-full border rounded-md">
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Situação</TableHead>
                    <TableHead>Cliente (Razão Social)</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Último Receb.</TableHead>
                    <TableHead className="text-right">Valor Conta</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                    <TableHead className="text-right">A Receber</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead className="text-right">Juros</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Conta Corrente</TableHead>
                    <TableHead>Nº Boleto</TableHead>
                    <TableHead>Tipo Doc.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contas.map((c, index) => {
                    const saldoAReceber = (c.valor_documento || 0) - (c.valor_pago || c.valor_baixa || 0);
                    return (
                      <TableRow key={c.codigo_lancamento_omie || index}>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            c.status_titulo === 'RECEBIDO' ? 'bg-green-100 text-green-700' :
                            c.status_titulo === 'ATRASADO' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {c.status_titulo || 'PENDENTE'}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate" title={c.nome_cliente || c.razao_social_cliente || 'N/A'}>
                          {c.nome_cliente || c.razao_social_cliente || 'N/A'}
                        </TableCell>
                        <TableCell>{c.data_emissao}</TableCell>
                        <TableCell>{c.data_vencimento}</TableCell>
                        <TableCell>{c.data_pagamento || c.data_baixa || '-'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(c.valor_documento)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(c.valor_pago || c.valor_baixa)}</TableCell>
                        <TableCell className="text-right text-orange-600">{formatCurrency(saldoAReceber)}</TableCell>
                        <TableCell className="text-right text-red-500">{formatCurrency(c.valor_desconto)}</TableCell>
                        <TableCell className="text-right text-red-500">{formatCurrency(c.valor_juros)}</TableCell>
                        <TableCell className="max-w-[120px] truncate" title={c.codigo_categoria}>{c.codigo_categoria}</TableCell>
                        <TableCell>{c.id_conta_corrente || c.codigo_conta_corrente || '-'}</TableCell>
                        <TableCell>{c.numero_boleto || c.boleto?.cNumBoleto || '-'}</TableCell>
                        <TableCell>{c.tipo_documento || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
