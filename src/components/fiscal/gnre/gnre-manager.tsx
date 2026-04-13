'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { enviarLoteGnre, consultarLoteGnre, GnreData } from '@/app/actions/fiscal/gnre';
import { Loader2, Plus, FileText, Send, Search, CheckCircle2, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export function GnreManager() {
  const [loading, setLoading] = useState(false);
  const [guias, setGuias] = useState<GnreData[]>([]);
  const [recibo, setRecibo] = useState<string | null>(null);
  const [statusLote, setStatusLote] = useState<any>(null);

  // Estado para o formulário da nova guia
  const [novaGuia, setNovaGuia] = useState<Partial<GnreData>>({
    ufFavorecida: 'PE',
    receita: '100099', // ICMS ST por Operação
    valor: 0,
    contribuinte: {
      cnpj: '',
      razaoSocial: ''
    },
    dataVencimento: new Date().toISOString().split('T')[0]
  });

  const handleAddGuia = () => {
    if (!novaGuia.contribuinte?.cnpj || !novaGuia.contribuinte?.razaoSocial || !novaGuia.valor) {
      toast.error('Preencha os campos obrigatórios da guia (CNPJ, Razão Social e Valor).');
      return;
    }

    setGuias([...guias, novaGuia as GnreData]);
    setNovaGuia({
      ...novaGuia,
      contribuinte: { cnpj: '', razaoSocial: '' },
      valor: 0
    });
    toast.success('Guia adicionada ao lote temporário.');
  };

  const handleRemoveGuia = (index: number) => {
    setGuias(guias.filter((_, i) => i !== index));
  };

  const handleEnviarLote = async () => {
    if (guias.length === 0) {
      toast.error('Adicione ao menos uma guia para enviar o lote.');
      return;
    }

    setLoading(true);
    try {
      const res = await enviarLoteGnre(guias);
      if (res.success) {
        toast.success(res.message);
        setRecibo(res.numeroRecibo || null);
        setStatusLote(null);
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error('Erro inesperado ao enviar o lote GNRE.');
    } finally {
      setLoading(false);
    }
  };

  const handleConsultarLote = async () => {
    if (!recibo) return;

    setLoading(true);
    try {
      const res = await consultarLoteGnre(recibo);
      if (res.success) {
        toast.success('Consulta realizada com sucesso.');
        setStatusLote(res);
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error('Erro inesperado ao consultar o lote GNRE.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Automação GNRE</h2>
        <p className="text-muted-foreground text-sm">
          Geração e transmissão de Lotes GNRE para a SEFAZ através de WebServices.
        </p>
      </div>

      <Tabs defaultValue="geracao" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="geracao">1. Geração de Lote</TabsTrigger>
          <TabsTrigger value="processamento" disabled={!recibo}>2. Processamento e Retorno</TabsTrigger>
        </TabsList>

        <TabsContent value="geracao" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Formulário de Inclusão de Guia */}
            <Card className="md:col-span-1 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  Nova Guia GNRE
                </CardTitle>
                <CardDescription>Preencha os dados para adicionar a guia ao lote de envio.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>UF Favorecida</Label>
                  <Select 
                    value={novaGuia.ufFavorecida} 
                    onValueChange={(val) => setNovaGuia({ ...novaGuia, ufFavorecida: val })}
                  >
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Código da Receita</Label>
                  <Select 
                    value={novaGuia.receita} 
                    onValueChange={(val) => setNovaGuia({ ...novaGuia, receita: val })}
                  >
                    <SelectTrigger><SelectValue placeholder="Receita" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100099">100099 - ICMS ST por Operação</SelectItem>
                      <SelectItem value="100080">100080 - ICMS Transporte</SelectItem>
                      <SelectItem value="100048">100048 - ICMS Comunicação</SelectItem>
                      <SelectItem value="100056">100056 - ICMS Energia Elétrica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>CNPJ do Contribuinte</Label>
                  <Input 
                    placeholder="00.000.000/0000-00" 
                    value={novaGuia.contribuinte?.cnpj || ''}
                    onChange={(e) => setNovaGuia({ 
                      ...novaGuia, 
                      contribuinte: { ...novaGuia.contribuinte!, cnpj: e.target.value } 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Razão Social</Label>
                  <Input 
                    placeholder="Empresa Exemplo LTDA" 
                    value={novaGuia.contribuinte?.razaoSocial || ''}
                    onChange={(e) => setNovaGuia({ 
                      ...novaGuia, 
                      contribuinte: { ...novaGuia.contribuinte!, razaoSocial: e.target.value } 
                    })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      value={novaGuia.valor || ''}
                      onChange={(e) => setNovaGuia({ ...novaGuia, valor: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento</Label>
                    <Input 
                      type="date" 
                      value={novaGuia.dataVencimento || ''}
                      onChange={(e) => setNovaGuia({ ...novaGuia, dataVencimento: e.target.value })}
                    />
                  </div>
                </div>
                <Button className="w-full mt-4" onClick={handleAddGuia} variant="secondary">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar ao Lote
                </Button>
              </CardContent>
            </Card>

            {/* Lote de Guias Adicionadas */}
            <Card className="md:col-span-2 shadow-sm flex flex-col">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Lote de Envio ({guias.length}/50)</CardTitle>
                    <CardDescription>Guias aguardando transmissão para o Portal GNRE.</CardDescription>
                  </div>
                  <Button 
                    onClick={handleEnviarLote} 
                    disabled={guias.length === 0 || loading}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Transmitir Lote
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-[400px]">
                  {guias.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center space-y-2">
                      <FileText className="h-12 w-12 opacity-20" />
                      <p>O lote está vazio.</p>
                      <p className="text-sm">Adicione guias no painel ao lado para iniciar a transmissão.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {guias.map((g, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700">{g.contribuinte.razaoSocial}</span>
                              <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full font-medium">
                                {g.ufFavorecida}
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                                Rec: {g.receita}
                              </span>
                            </div>
                            <div className="text-sm text-slate-500 flex gap-4">
                              <span>CNPJ: {g.contribuinte.cnpj}</span>
                              <span>Venc: {new Date(g.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-black text-emerald-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(g.valor)}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveGuia(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                              Remover
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="processamento" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Retorno do Processamento SEFAZ
              </CardTitle>
              <CardDescription>
                Acompanhe o status do lote enviado e faça o download das guias GNRE geradas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase">Recibo do Lote</p>
                  <p className="text-2xl font-mono font-bold text-slate-800 tracking-wider">{recibo}</p>
                </div>
                <Button onClick={handleConsultarLote} disabled={loading} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  Consultar Status
                </Button>
              </div>

              {statusLote && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-md border border-emerald-200">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Status: Lote {statusLote.situacaoLote || 'Processado com Sucesso'}</span>
                  </div>

                  <div className="border rounded-md">
                    <div className="bg-slate-100 px-4 py-2 border-b font-semibold text-sm text-slate-600">
                      Guias Processadas ({statusLote.guiasProcessadas?.length || 0})
                    </div>
                    <div className="divide-y">
                      {statusLote.guiasProcessadas?.map((g: any, i: number) => (
                        <div key={i} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-slate-700">Linha Digitável:</p>
                            <p className="text-sm font-mono bg-slate-100 px-2 py-1 rounded border text-slate-600">{g.linhaDigitavel}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-2">
                              <Download className="h-4 w-4" /> PDF
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Download className="h-4 w-4" /> XML
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
