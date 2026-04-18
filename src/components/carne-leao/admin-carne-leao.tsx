'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Save, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';

export function AdminCarneLeaoManager({ user, initialRendimentos, initialPagamentos }: any) {
  const [rendimentos, setRendimentos] = useState(initialRendimentos);
  const [pagamentos, setPagamentos] = useState(initialPagamentos);
  const [activeTab, setActiveTab] = useState('rendimentos');

  const handleRendimentoChange = (index: number, field: string, value: any) => {
    const updated = [...rendimentos];
    updated[index][field] = value;
    setRendimentos(updated);
  };

  const handlePagamentoChange = (index: number, field: string, value: any) => {
    const updated = [...pagamentos];
    updated[index][field] = value;
    setPagamentos(updated);
  };

  const handleSaveRendimento = async (id: string, index: number) => {
    try {
      const item = rendimentos[index];
      await fetch(`/api/carne-leao/rendimentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      toast.success('Rendimento salvo com sucesso');
    } catch (e) {
      toast.error('Erro ao salvar rendimento');
    }
  };

  const handleDeleteRendimento = async (id: string, index: number) => {
    if (!confirm('Deseja realmente excluir este lançamento?')) return;
    try {
      await fetch(`/api/carne-leao/rendimentos/${id}`, { method: 'DELETE' });
      const updated = [...rendimentos];
      updated.splice(index, 1);
      setRendimentos(updated);
      toast.success('Rendimento excluído');
    } catch (e) {
      toast.error('Erro ao excluir');
    }
  };

  const handleSavePagamento = async (id: string, index: number) => {
    try {
      const item = pagamentos[index];
      await fetch(`/api/carne-leao/pagamentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      toast.success('Pagamento salvo com sucesso');
    } catch (e) {
      toast.error('Erro ao salvar pagamento');
    }
  };

  const handleDeletePagamento = async (id: string, index: number) => {
    if (!confirm('Deseja realmente excluir este lançamento?')) return;
    try {
      await fetch(`/api/carne-leao/pagamentos/${id}`, { method: 'DELETE' });
      const updated = [...pagamentos];
      updated.splice(index, 1);
      setPagamentos(updated);
      toast.success('Pagamento excluído');
    } catch (e) {
      toast.error('Erro ao excluir');
    }
  };

  const handleExport = () => {
    // Generate CSV for export
    let csv = "Data do lançamento;Código do rendimento/pagamento;Código da ocupação;Valor recebido/pago;Valor da dedução;Histórico;Indicador de recebido de;CPF do titular;CPF do beneficiário;Indicador CPF não informado;CNPJ;Indicador de IRRF;Valor IRRF\\n";
    
    rendimentos.forEach((r: any) => {
        // Format based on Receita Federal manual
        const date = new Date(r.data_recebimento).toLocaleDateString('pt-BR');
        const codRendimento = 'R01.001.001'; // Defaulting for Trabalho Não Assalariado as per manual
        const codOcupacao = ''; 
        const valRecebido = Number(r.valor || 0).toFixed(2).replace('.', ',');
        const valDeducao = '';
        const hist = r.historico || '';
        const recebidoDe = r.recebido_de?.toUpperCase() || '';
        const cpfTit = r.cpf_responsavel?.replace(/\\D/g, '') || '';
        const cpfBen = r.cpf_beneficiario?.replace(/\\D/g, '') || '';
        const indCpfNaoInf = r.cpf_nao_informado ? 'S' : '';
        const cnpj = r.cnpj?.replace(/\\D/g, '') || '';
        const indIrrf = r.valor_irrf && r.valor_irrf > 0 ? 'S' : 'N';
        const valIrrf = r.valor_irrf ? Number(r.valor_irrf).toFixed(2).replace('.', ',') : '';

        csv += `${date};${codRendimento};${codOcupacao};${valRecebido};${valDeducao};${hist};${recebidoDe};${cpfTit};${cpfBen};${indCpfNaoInf};${cnpj};${indIrrf};${valIrrf}\\n`;
    });

    pagamentos.forEach((p: any) => {
        const date = new Date(p.data_pagamento).toLocaleDateString('pt-BR');
        const codPagamento = ''; // Maps to plano de contas
        const valPago = Number(p.valor || 0).toFixed(2).replace('.', ',');
        const hist = p.historico || '';
        
        csv += `${date};${codPagamento};;${valPago};;${hist};;;;;;;\\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `carne_leao_export_${user.name.replace(/\\s/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/pessoa-fisica/carne-leao">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white border-gray-200 shadow-sm text-slate-600 hover:bg-slate-50">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Manutenção Carnê Leão</h2>
            <p className="text-muted-foreground text-sm">Cliente: <span className="font-semibold text-slate-700">{user.name}</span></p>
          </div>
        </div>
        <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Download className="h-4 w-4" />
          Exportar Receita
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="rendimentos">Rendimentos</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="rendimentos" className="mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Lançamentos de Rendimentos</CardTitle>
            </CardHeader>
            <CardContent>
              {rendimentos.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum rendimento cadastrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                      <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Natureza</th>
                        <th className="px-4 py-3">Histórico</th>
                        <th className="px-4 py-3">Valor</th>
                        <th className="px-4 py-3">Recebido De</th>
                        <th className="px-4 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rendimentos.map((r: any, idx: number) => (
                        <tr key={r.id} className="border-b hover:bg-slate-50/50">
                          <td className="px-4 py-2">
                            <Input 
                                type="date" 
                                value={r.data_recebimento ? new Date(r.data_recebimento).toISOString().split('T')[0] : ''} 
                                onChange={(e) => handleRendimentoChange(idx, 'data_recebimento', e.target.value)}
                                className="h-8 text-xs w-[130px]" 
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input 
                                value={r.natureza || ''} 
                                onChange={(e) => handleRendimentoChange(idx, 'natureza', e.target.value)}
                                className="h-8 text-xs w-[150px]" 
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input 
                                value={r.historico || ''} 
                                onChange={(e) => handleRendimentoChange(idx, 'historico', e.target.value)}
                                className="h-8 text-xs w-full min-w-[200px]" 
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input 
                                type="number"
                                value={r.valor || 0} 
                                onChange={(e) => handleRendimentoChange(idx, 'valor', e.target.value)}
                                className="h-8 text-xs w-[100px]" 
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input 
                                value={r.recebido_de || ''} 
                                onChange={(e) => handleRendimentoChange(idx, 'recebido_de', e.target.value)}
                                className="h-8 text-xs w-[60px]" 
                            />
                          </td>
                          <td className="px-4 py-2 flex gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleSaveRendimento(r.id, idx)} className="h-8 w-8 text-emerald-600 hover:bg-emerald-50">
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteRendimento(r.id, idx)} className="h-8 w-8 text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Lançamentos de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {pagamentos.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum pagamento cadastrado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                      <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Natureza</th>
                        <th className="px-4 py-3">Histórico</th>
                        <th className="px-4 py-3">Valor</th>
                        <th className="px-4 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagamentos.map((p: any, idx: number) => (
                        <tr key={p.id} className="border-b hover:bg-slate-50/50">
                          <td className="px-4 py-2">
                            <Input 
                                type="date" 
                                value={p.data_pagamento ? new Date(p.data_pagamento).toISOString().split('T')[0] : ''} 
                                onChange={(e) => handlePagamentoChange(idx, 'data_pagamento', e.target.value)}
                                className="h-8 text-xs w-[130px]" 
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input 
                                value={p.natureza || ''} 
                                onChange={(e) => handlePagamentoChange(idx, 'natureza', e.target.value)}
                                className="h-8 text-xs w-[180px]" 
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input 
                                value={p.historico || ''} 
                                onChange={(e) => handlePagamentoChange(idx, 'historico', e.target.value)}
                                className="h-8 text-xs w-full min-w-[250px]" 
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input 
                                type="number"
                                value={p.valor || 0} 
                                onChange={(e) => handlePagamentoChange(idx, 'valor', e.target.value)}
                                className="h-8 text-xs w-[100px]" 
                            />
                          </td>
                          <td className="px-4 py-2 flex gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleSavePagamento(p.id, idx)} className="h-8 w-8 text-emerald-600 hover:bg-emerald-50">
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDeletePagamento(p.id, idx)} className="h-8 w-8 text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}