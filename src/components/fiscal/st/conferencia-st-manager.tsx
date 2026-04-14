'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { validarArquivosST } from '@/app/actions/fiscal/conferencia-st';
import { listarHistoricoSt } from '@/app/actions/fiscal/historico-st';
import { Loader2, Upload, FileText, Trash2, CheckCircle2, ChevronLeft, Download, History, Eye, Plus, Search, ChevronDownIcon, Receipt, Calculator } from 'lucide-react';
import { CompanySelector } from '@/components/shared/company-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import * as XLSX from 'xlsx';
import { gerarDarjSt } from '@/app/actions/fiscal/gerar-darj-st';

export function ConferenciaStManager() {
  const [loading, setLoading] = useState(false);
  const [empresaId, setEmpresaId] = useState<string>('');
  const [empresaNome, setEmpresaNome] = useState<string>('');
  const [arquivos, setArquivos] = useState<{ name: string, content: string }[]>([]);
  const [resultado, setResultado] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'nova' | 'historico'>('nova');
  const [historico, setHistorico] = useState<any[]>([]);
  
  // Filtros
  const [buscaNcmCest, setBuscaNcmCest] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('Todos');
  const [filtroNotas, setFiltroNotas] = useState<string[]>([]);

  // DARJ State
  const [modalDarjOpen, setModalDarjOpen] = useState(false);
  const [dataDarj, setDataDarj] = useState<string>(new Date().toISOString().substring(0, 10));
  const [dataVencimento, setDataVencimento] = useState<string>(new Date().toISOString().substring(0, 10));
  const [tipoApuracao, setTipoApuracao] = useState<'periodo' | 'operacao'>('operacao');
  const [natureza, setNatureza] = useState('4');
  const [produto, setProduto] = useState('396');
  const [tipoPeriodo, setTipoPeriodo] = useState('M');
  const [infoCompl, setInfoCompl] = useState('');
  
  // Campos "Por operação"
  const [notaFiscalNum, setNotaFiscalNum] = useState('');
  const [notaFiscalSerie, setNotaFiscalSerie] = useState('');
  const [notaFiscalTipo, setNotaFiscalTipo] = useState('NFe');
  const [notaFiscalData, setNotaFiscalData] = useState('');
  const [notaFiscalCnpjEmitente, setNotaFiscalCnpjEmitente] = useState('');
  const [gerandoDarj, setGerandoDarj] = useState(false);
  const [darjResult, setDarjResult] = useState<any>(null);

  const toggleStatusFiltro = (status: string) => {
    setFiltroStatus(status);
  };

  const handleExportXLSX = () => {
     if (!resultado) return;

     // Cabeçalho ECONET style
     const data = [
        [`ECONET VALIDADOR NFe ICMS - ST
${empresaNome} / Consulta #${resultado.consulta_id || 'N/A'}
Data consulta: ${new Date().toLocaleDateString('pt-BR')}
Data exportação: ${new Date().toLocaleDateString('pt-BR')}`],
        [],
        [],
        [],
        [
          "Nota", "Data", "Descrição", "NCM", "CEST", "CFOP", "CST", 
          "Valor Item", "IPI", "Frete", "Seguro", "Desconto", "Outras Despesas", 
          "Valor Total do Item", "BC ICMS", "Alíquota ICMS", "ICMS Próprio", 
          "BC ST", "Alíquota ICMS ST", "ICMS ST Destacado", "MVA", 
          "BC ST Calculado", "Alí.Interna + FECOEP", "ICMS ST Calculado", 
          "ICMS ST Puro (20%)", "FECP ST (2%)",
          "Dif. Recolher", "Alerta"
        ]
     ];

     itensFiltrados.forEach((item: any) => {
        data.push([
           item.nota,
           item.data.split('-').reverse().join('/'),
           item.descricao,
           item.ncm,
           item.cest || '-',
           item.cfop,
           item.cst,
           item.valorItem,
           item.ipi || 0,
           item.frete || 0,
           item.seguro || 0,
           item.desconto || 0,
           item.outrasDespesas || 0,
           item.valorTotalItem,
           item.bcIcms || 0,
           item.aliquotaIcms || null,
           item.icmsProprio || 0,
           item.bcSt || 0,
           item.aliquotaIcmsSt || 0,
           item.icmsSt || 0,
           item.mva || null,
           item.bcStCalculado || null,
           item.aliInternaFecoep || null,
           item.valorSt || null,
           item.icms_st_puro_calculado || null,
           item.fecp_st_calculado || null,
           item.difRecolher || null,
           item.alerta || (item.status === 'Não Calculado' ? 'A NCM/CEST informado não foi encontrada em nossa base de dados. Baseado nos demais dados do documento fiscal, verifique nossas sugestões ao editar o registro. Caso as sugestões não se enquadrem ao seu produto, basta não selecionar, pois seu produto não está sujeito ao regime de substituição tributária' : '')
        ]);
     });

     const ws = XLSX.utils.aoa_to_sheet(data);
     const wb = XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb, ws, 'Conferência');
    XLSX.writeFile(wb, `Conferencia_ST_${empresaNome.replace(/[^a-z0-9]/gi, '_')}.xlsx`);
  };

  const loadHistorico = async () => {
    setLoading(true);
    const res = await listarHistoricoSt();
    if (res.success) {
      setHistorico(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'historico') {
      loadHistorico();
    }
  }, [activeTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newArquivos = [...arquivos];
    let loaded = 0;
    
    Array.from(files).forEach(file => {
      if (!file.name.toLowerCase().endsWith('.xml')) {
        toast.error(`Arquivo ${file.name} não é um XML válido.`);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        newArquivos.push({
          name: file.name,
          content: event.target?.result as string
        });
        loaded++;
        if (loaded === Array.from(files).filter(f => f.name.toLowerCase().endsWith('.xml')).length) {
          setArquivos(newArquivos);
        }
      };
      reader.readAsText(file);
    });
  };

  const removerArquivo = (index: number) => {
    setArquivos(arquivos.filter((_, i) => i !== index));
  };

  const handleConfirmarEnvio = async () => {
    if (!empresaId) {
      toast.error('Selecione uma empresa destinatária.');
      return;
    }
    if (arquivos.length === 0) {
      toast.error('Selecione ao menos um arquivo XML.');
      return;
    }

    setLoading(true);
    try {
      const xmls = arquivos.map(a => a.content);
      const res = await validarArquivosST(xmls, empresaId, empresaNome || 'Empresa');
      if (res.success) {
        setResultado(res.data);
        toast.success('Arquivos processados com sucesso!');
      } else {
        toast.error(res.error);
      }
    } catch (err) {
      toast.error('Erro ao validar os arquivos XML.');
    } finally {
      setLoading(false);
    }
  };

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatPct = (val: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0) + '%';

  const preencherCamposNota = () => {
    if (!resultado || !resultado.itens || resultado.itens.length === 0) return;
    
    // Pega a primeira nota da lista (assumindo que o usuário filtrou para 1 nota)
    const notaFiltrada = filtroNotas.length === 1 
       ? resultado.itens.find((i: any) => i.nota === filtroNotas[0])
       : resultado.itens[0];

    if (notaFiltrada) {
       setNotaFiscalNum(notaFiltrada.nota || '');
       setNotaFiscalSerie(notaFiltrada.serie || '1');
       setNotaFiscalData(notaFiltrada.data || '');
       setNotaFiscalCnpjEmitente(notaFiltrada.cnpj_emitente || '');
       toast.success('Campos preenchidos com os dados do XML!');
    }
  };

  const handleGerarDarj = async () => {
    if (!resultado || !dataDarj || !dataVencimento) return;
    if (resultado.resumo.totalIcmsStPuro <= 0 && resultado.resumo.totalFecpSt <= 0) {
       toast.error('Não há valores de ST a recolher nesta conferência.');
       return;
    }

    setGerandoDarj(true);
    try {
      const res = await gerarDarjSt({
         empresaId,
         dataPagamento: dataDarj,
         dataVencimento: dataVencimento,
         natureza: natureza,
         produto: produto,
         tipoApuracao: tipoApuracao === 'periodo' ? 1 : 2,
         tipoPeriodo: tipoPeriodo,
         informacoesComplementares: infoCompl,
         totalIcmsStPuro: resultado.resumo.totalIcmsStPuro,
         totalFecpSt: resultado.resumo.totalFecpSt,
         totalGeral: resultado.resumo.totalIcmsStCalculado,
         periodoMes: parseInt(dataDarj.split('-')[1]),
         periodoAno: parseInt(dataDarj.split('-')[0]),
         notaFiscal: tipoApuracao === 'operacao' ? {
            numero: notaFiscalNum,
            serie: notaFiscalSerie,
            tipo: notaFiscalTipo,
            dataEmissao: notaFiscalData,
            cnpjEmitente: notaFiscalCnpjEmitente.replace(/\D/g, '')
         } : undefined
      });

      if (res.success) {
         toast.success('DARJ gerado com sucesso!');
         setDarjResult(res.data);
      } else {
         toast.error(res.error || 'Erro ao gerar DARJ na SEFAZ RJ.');
      }
    } catch (err) {
      toast.error('Erro na conexão com a SEFAZ RJ.');
    } finally {
      setGerandoDarj(false);
    }
  };

  // Tela de Resultado
  if (resultado) {
    const notasUnicas = Array.from(new Set(resultado.itens.map((i: any) => i.nota))) as string[];

    const itensFiltrados = resultado.itens.filter((item: any) => {
      // Filtro Status
      if (filtroStatus !== 'Todos' && item.status !== filtroStatus) {
         return false;
      }
      
      // Filtro Notas
      if (filtroNotas.length > 0 && !filtroNotas.includes(item.nota)) return false;

      // Filtro NCM/CEST
      if (buscaNcmCest) {
         if (!item.ncm.includes(buscaNcmCest) && !item.cest.includes(buscaNcmCest)) return false;
      }
      
      return true;
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">Conferência ICMS - ST</h2>
            <Button variant="outline" onClick={() => setResultado(null)}>Nova Consulta</Button>
          </div>
          
          <div className="flex items-center gap-2 text-indigo-600 font-medium">
            <Button variant="ghost" size="icon" onClick={() => setResultado(null)} className="h-6 w-6"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="uppercase tracking-wider">{empresaNome}</span> 
            <span className="text-slate-400 font-normal">› Consulta #{Math.floor(Math.random() * 1000000)}</span>
            <div className="ml-auto flex gap-2">
              <span className="bg-blue-400 text-white text-xs px-3 py-1 rounded-full font-bold">Quantidade de Notas: {resultado.resumo.qtdNotas}</span>
              <span className="bg-blue-400 text-white text-xs px-3 py-1 rounded-full font-bold">Valor total das Notas: {formatBRL(resultado.resumo.valorTotalNotas)}</span>
            </div>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-0 border rounded-lg bg-white overflow-hidden shadow-sm">
          <div className="p-4 border-r flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-700">Base ICMS-ST Calculado</span>
            <span className="text-lg font-medium text-slate-500">{formatBRL(resultado.resumo.totalBaseST)}</span>
          </div>
          <div className="p-4 border-r flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-700">Valor antes do Abatimento</span>
            <span className="text-lg font-medium text-slate-500">{formatBRL(resultado.resumo.totalValorAntesAbatimento)}</span>
          </div>
          <div className="p-4 border-r flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-700">Valor ICMS Próprio</span>
            <span className="text-lg font-medium text-slate-500">{formatBRL(resultado.resumo.totalIcmsProprio)}</span>
          </div>
          <div className="p-4 border-r flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-700">ICMS ST Destacado</span>
            <span className="text-lg font-medium text-slate-500">{formatBRL(resultado.resumo.totalIcmsStDestacado)}</span>
          </div>
          <div className="p-4 border-r flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-700">ICMS ST Calculado</span>
            <span className="text-lg font-medium text-slate-500">{formatBRL(resultado.resumo.totalIcmsStCalculado)}</span>
          </div>
          <div className="p-4 border-r flex flex-col justify-center bg-emerald-50/50">
            <span className="text-xs font-bold text-emerald-700">ICMS ST (20%) + FECP ST (2%)</span>
            <div className="flex flex-col mt-1">
              <span className="text-sm font-medium text-emerald-600">{formatBRL(resultado.resumo.totalIcmsStPuro || 0)} <span className="text-[10px] text-emerald-500 font-normal">ST Puro</span></span>
              <span className="text-sm font-medium text-emerald-600">{formatBRL(resultado.resumo.totalFecpSt || 0)} <span className="text-[10px] text-emerald-500 font-normal">FECP</span></span>
            </div>
          </div>
          <div className="p-4 flex flex-col justify-center border-2 border-amber-400 bg-amber-50">
            <span className="text-xs font-bold text-slate-800">Diferença a Recolher</span>
            <span className="text-lg font-black text-amber-600">{formatBRL(resultado.resumo.totalDiferencaRecolher)}</span>
          </div>
        </div>

        {/* Filtros da Tabela e Legendas */}
        <div className="flex flex-col gap-4 mt-4">
           <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="NCM/CEST" 
                  className="pl-9"
                  value={buscaNcmCest}
                  onChange={e => setBuscaNcmCest(e.target.value)}
                />
              </div>
              <div className="flex-1 max-w-sm">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                       <Button variant="outline" className="w-full justify-between font-normal text-slate-600">
                           {filtroNotas.length > 0 ? `${filtroNotas.length} NFe(s) selecionada(s)` : 'Todas as NFes'}
                           <ChevronDownIcon className="h-4 w-4 opacity-50" />
                       </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="start">
                       <DropdownMenuCheckboxItem
                          checked={filtroNotas.length === 0}
                          onCheckedChange={(checked) => setFiltroNotas(checked ? [] : notasUnicas)}
                       >
                          Todas as NFes
                       </DropdownMenuCheckboxItem>
                       {notasUnicas.map(nota => (
                          <DropdownMenuCheckboxItem
                             key={nota}
                             checked={filtroNotas.includes(nota)}
                             onCheckedChange={(checked) => {
                                setFiltroNotas(prev => 
                                   checked ? [...prev, nota] : prev.filter(n => n !== nota)
                                )
                             }}
                          >
                             {nota}
                          </DropdownMenuCheckboxItem>
                       ))}
                    </DropdownMenuContent>
                 </DropdownMenu>
              </div>
              <Button variant="outline" onClick={handleExportXLSX} className="ml-auto border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                <Download className="h-4 w-4 mr-2" /> Exportar
              </Button>
              <Dialog open={modalDarjOpen} onOpenChange={setModalDarjOpen}>
                 <DialogTrigger asChild>
                    <Button 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                        disabled={resultado.resumo.qtdNotas > 1}
                        title={resultado.resumo.qtdNotas > 1 ? "O DARJ só pode ser gerado para uma única nota (Por Operação). Filtre a nota desejada antes de gerar." : "Gerar guia DARJ"}
                    >
                       <Receipt className="h-4 w-4 mr-2" />
                       Gerar DARJ ST (RJ)
                    </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-3xl h-[90vh] overflow-y-auto">
                    <DialogHeader>
                       <DialogTitle className="text-xl flex items-center gap-2"><Receipt className="h-5 w-5 text-indigo-600"/> Emitir DARJ - Substituição Tributária</DialogTitle>
                       <DialogDescription>
                          Preencha e valide os dados abaixo para emissão da guia via Webservice da SEFAZ RJ.
                       </DialogDescription>
                    </DialogHeader>
                    {!darjResult ? (
                    <div className="flex flex-col gap-6 py-2">
                       {/* Dados do Pagamento */}
                       <div>
                          <h4 className="text-emerald-700 font-bold text-lg mb-2 border-b border-emerald-100 pb-1">Dados do pagamento</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-600">Tipo de Pagamento *</Label>
                                <Input value="ICMS/FECP" disabled className="bg-slate-50 font-medium" />
                             </div>
                             <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-600">Tipo de Documento *</Label>
                                <Input value="DARJ" disabled className="bg-slate-50 font-medium" />
                             </div>
                             <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-600">Data de Pagamento *</Label>
                                <Input 
                                   type="date" 
                                   value={dataDarj}
                                   onChange={e => setDataDarj(e.target.value)}
                                   min={new Date().toISOString().substring(0, 10)}
                                   className="font-medium"
                                />
                             </div>
                          </div>
                       </div>

                       {/* Itens de Pagamento */}
                       <div>
                          <h4 className="text-emerald-700 font-bold text-lg mb-2 border-b border-emerald-100 pb-1">Itens de Pagamento</h4>
                          <div className="bg-slate-50 border rounded-md p-4 space-y-4">
                             {/* Campos Condicionais para 'Por operação' */}
                             

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                   <Label className="text-xs font-bold text-slate-600">Natureza *</Label>
                                   <Select value={natureza} onValueChange={setNatureza}>
                                      <SelectTrigger className="bg-white">
                                         <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                         <SelectItem value="1">ICMS Subst. Tributária Operação Interna - Apur. Mensal</SelectItem>
                                         <SelectItem value="4">Substituição Tributária por Operação / Outros</SelectItem>
                                      </SelectContent>
                                   </Select>
                                </div>
                                <div className="space-y-1">
                                   <Label className="text-xs font-bold text-slate-600">Produto *</Label>
                                   <Select value={produto} onValueChange={setProduto}>
                                      <SelectTrigger className="bg-white">
                                         <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                         <SelectItem value="108">Bebidas</SelectItem>
                                         <SelectItem value="116">Cigarros e Outros Produtos Derivados do Fumo</SelectItem>
                                         <SelectItem value="124">Veículos e Pneumáticos</SelectItem>
                                         <SelectItem value="132">Medicamentos e Produtos Farmacêuticos</SelectItem>
                                         <SelectItem value="140">Peças, Partes e Acessórios para Veículos Automotores</SelectItem>
                                         <SelectItem value="159">Material de Construção</SelectItem>
                                         <SelectItem value="167">Produtos Alimentícios</SelectItem>
                                         <SelectItem value="175">Cimento</SelectItem>
                                         <SelectItem value="183">Tintas e Vernizes</SelectItem>
                                         <SelectItem value="191">Venda Porta a Porta</SelectItem>
                                         <SelectItem value="205">Material de Limpeza Doméstica</SelectItem>
                                         <SelectItem value="396">Outros</SelectItem>
                                      </SelectContent>
                                   </Select>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-slate-600">CNPJ/CPF *</Label>
                                    <Input value="Preenchimento Automático" disabled className="bg-white text-slate-400 italic" />
                                 </div>
                                 <div className="space-y-1">
                                    <Label className="text-xs font-bold text-slate-600">Inscrição Estadual - RJ</Label>
                                    <Input value="99199237" disabled className="bg-white text-slate-400" />
                                 </div>
                                 <div className="space-y-1">
                                    <Label className="text-xs font-bold text-slate-600">Razão Social/Nome *</Label>
                                    <Input value={empresaNome || 'Carregando...'} disabled className="bg-white font-medium" />
                                 </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                   <Label className="text-xs font-bold text-slate-600">Tipo de Apuração *</Label>
                                   <RadioGroup value={tipoApuracao} onValueChange={(val: any) => setTipoApuracao(val)} className="flex items-center space-x-4">
                                      <div className="flex items-center space-x-2">
                                         <RadioGroupItem value="periodo" id="por-periodo" />
                                         <Label htmlFor="por-periodo" className="cursor-pointer">Por período</Label>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                         <RadioGroupItem value="operacao" id="por-operacao" />
                                         <Label htmlFor="por-operacao" className="cursor-pointer">Por operação</Label>
                                      </div>
                                   </RadioGroup>
                                </div>
                                {tipoApuracao === 'periodo' && (
                                   <div className="space-y-1">
                                      <Label className="text-xs font-bold text-slate-600">Tipo Período *</Label>
                                      <Select value={tipoPeriodo} onValueChange={setTipoPeriodo}>
                                         <SelectTrigger className="bg-white">
                                            <SelectValue />
                                         </SelectTrigger>
                                         <SelectContent>
                                            <SelectItem value="M">Mensal</SelectItem>
                                            <SelectItem value="Q">Quinzenal</SelectItem>
                                            <SelectItem value="D">Decendial</SelectItem>
                                         </SelectContent>
                                      </Select>
                                   </div>
                                )}
                             </div>

                             {/* Campos Condicionais para 'Por operação' */}
                             {tipoApuracao === 'operacao' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-indigo-50/50 rounded-md border border-indigo-100 mt-2 relative">
                                   <Button 
                                      type="button" 
                                      size="sm" 
                                      className="absolute -top-3 -right-3 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-full px-3 py-1 text-xs"
                                      onClick={preencherCamposNota}
                                      title="Preencher com os dados do XML atual"
                                   >
                                      <FileText className="w-3 h-3 mr-1" />
                                      Preencher com XML
                                   </Button>
                                   <div className="space-y-1">
                                      <Label className="text-xs font-bold text-indigo-800">Nº Nota Fiscal *</Label>
                                      <Input 
                                         value={notaFiscalNum} 
                                         onChange={e => setNotaFiscalNum(e.target.value)} 
                                         className="bg-white border-indigo-200" 
                                         placeholder="Ex: 123456"
                                      />
                                   </div>
                                   <div className="space-y-1">
                                      <Label className="text-xs font-bold text-indigo-800">Série</Label>
                                      <Input 
                                         value={notaFiscalSerie} 
                                         onChange={e => setNotaFiscalSerie(e.target.value)} 
                                         className="bg-white border-indigo-200" 
                                         placeholder="Ex: 1"
                                      />
                                   </div>
                                   <div className="space-y-1">
                                      <Label className="text-xs font-bold text-indigo-800">Tipo *</Label>
                                      <Select value={notaFiscalTipo} onValueChange={setNotaFiscalTipo}>
                                         <SelectTrigger className="bg-white border-indigo-200">
                                            <SelectValue />
                                         </SelectTrigger>
                                         <SelectContent>
                                            <SelectItem value="NFe">Nota Fiscal Eletrônica</SelectItem>
                                            <SelectItem value="CTe">Conhecimento de Transporte</SelectItem>
                                            <SelectItem value="NFCe">NFC-e</SelectItem>
                                         </SelectContent>
                                      </Select>
                                   </div>
                                   <div className="space-y-1 md:col-span-1">
                                      <Label className="text-xs font-bold text-indigo-800">Data de Emissão *</Label>
                                      <Input 
                                         type="date"
                                         value={notaFiscalData} 
                                         onChange={e => setNotaFiscalData(e.target.value)} 
                                         className="bg-white font-medium border-indigo-200" 
                                      />
                                   </div>
                                   <div className="space-y-1 md:col-span-2">
                                      <Label className="text-xs font-bold text-indigo-800">CNPJ/CPF Emitente *</Label>
                                      <Input 
                                         value={notaFiscalCnpjEmitente} 
                                         onChange={e => setNotaFiscalCnpjEmitente(e.target.value)} 
                                         className="bg-white border-indigo-200" 
                                         placeholder="Apenas números (14 dígitos)"
                                         maxLength={14}
                                      />
                                   </div>
                                </div>
                             )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                 <div className="space-y-1">
                                    <Label className="text-xs font-bold text-slate-600">Data Vencimento *</Label>
                                    <Input 
                                       type="date" 
                                       value={dataVencimento}
                                       onChange={e => setDataVencimento(e.target.value)}
                                       className="bg-white font-medium"
                                    />
                                 </div>
                                 <div className="space-y-1">
                                    <Label className="text-xs font-bold text-slate-600">Informações Complementares</Label>
                                    <Textarea 
                                       value={infoCompl}
                                       onChange={e => setInfoCompl(e.target.value)}
                                       maxLength={255}
                                       className="bg-white resize-none h-10"
                                       placeholder="Ex: DARJ referente a notas fiscais..."
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>

                       {/* Valores em Reais */}
                       <div>
                          <h4 className="text-emerald-700 font-bold text-lg mb-2 border-b border-emerald-100 pb-1">Valores em Reais</h4>
                          <div className="bg-slate-50 border rounded-md p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                             {/* Coluna ICMS */}
                             <div className="space-y-3">
                                <div className="flex items-center justify-between bg-white border p-2 rounded-md">
                                   <span className="text-sm font-semibold text-slate-600">ICMS Informado</span>
                                   <span className="font-bold text-slate-800">{formatBRL(resultado.resumo.totalIcmsStPuro || 0)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm text-slate-500">
                                   <div className="flex flex-col border p-2 rounded bg-white/50">
                                      <span>Juros/Multa Mora</span>
                                      <span className="font-medium text-xs italic">Calculado via SEFAZ</span>
                                   </div>
                                   <div className="flex flex-col border p-2 rounded bg-emerald-50 text-emerald-800">
                                      <span className="font-semibold">Total ICMS</span>
                                      <span className="font-bold">{formatBRL(resultado.resumo.totalIcmsStPuro || 0)}</span>
                                   </div>
                                </div>
                             </div>
                             
                             {/* Coluna FECP */}
                             <div className="space-y-3">
                                <div className="flex items-center justify-between bg-white border p-2 rounded-md">
                                   <span className="text-sm font-semibold text-slate-600">FECP Informado</span>
                                   <span className="font-bold text-slate-800">{formatBRL(resultado.resumo.totalFecpSt || 0)}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm text-slate-500">
                                   <div className="flex flex-col border p-2 rounded bg-white/50">
                                      <span>Juros/Multa Mora</span>
                                      <span className="font-medium text-xs italic">Calculado via SEFAZ</span>
                                   </div>
                                   <div className="flex flex-col border p-2 rounded bg-emerald-50 text-emerald-800">
                                      <span className="font-semibold">Total FECP</span>
                                      <span className="font-bold">{formatBRL(resultado.resumo.totalFecpSt || 0)}</span>
                                   </div>
                                </div>
                             </div>

                             {/* Total Geral */}
                             <div className="col-span-1 md:col-span-2 flex justify-end">
                                <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 p-3 rounded-md min-w-[300px] justify-between">
                                   <span className="font-bold text-indigo-800 uppercase">Total da Guia</span>
                                   <span className="text-xl font-black text-indigo-700">{formatBRL(resultado.resumo.totalIcmsStCalculado || 0)}</span>
                                </div>
                             </div>
                          </div>
                       </div>

                    </div>
                    ) : (
                    <div className="flex flex-col gap-4 py-4 bg-emerald-50 rounded-lg p-6 mt-2 border border-emerald-100 items-center justify-center min-h-[300px]">
                       <div className="flex flex-col items-center text-center gap-3 mb-4">
                          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                             <CheckCircle2 className="w-10 h-10" />
                          </div>
                          <h3 className="font-bold text-emerald-800 text-2xl">Guia DARJ Gerada com Sucesso!</h3>
                          <p className="text-emerald-600 text-sm">O documento de arrecadação foi processado pela SEFAZ-RJ.</p>
                       </div>
                       
                       {/* Valores Calculados Retornados pela SEFAZ */}
                       {darjResult.valores && (
                       <div className="w-full max-w-lg bg-white border rounded-md p-4 mb-2">
                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 border-b pb-1">Demonstrativo de Valores</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                             <div className="space-y-1">
                                <div className="flex justify-between"><span className="text-slate-500">ICMS Informado:</span> <span className="font-medium">{formatBRL(resultado.resumo.totalIcmsStPuro)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Mora:</span> <span className="font-medium text-red-600">{formatBRL(darjResult.valores.icmsMora)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Multa:</span> <span className="font-medium text-red-600">{formatBRL(darjResult.valores.icmsMulta)}</span></div>
                                <div className="flex justify-between border-t pt-1"><span className="font-bold text-slate-700">ICMS Total:</span> <span className="font-bold">{formatBRL(darjResult.valores.icmsAtualizado)}</span></div>
                             </div>
                             <div className="space-y-1">
                                <div className="flex justify-between"><span className="text-slate-500">FECP Informado:</span> <span className="font-medium">{formatBRL(resultado.resumo.totalFecpSt)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Mora:</span> <span className="font-medium text-red-600">{formatBRL(darjResult.valores.fecpMora)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Multa:</span> <span className="font-medium text-red-600">{formatBRL(darjResult.valores.fecpMulta)}</span></div>
                                <div className="flex justify-between border-t pt-1"><span className="font-bold text-slate-700">FECP Total:</span> <span className="font-bold">{formatBRL(darjResult.valores.fecpAtualizado)}</span></div>
                             </div>
                          </div>
                          <div className="mt-3 pt-2 border-t flex justify-between items-center bg-emerald-50/50 p-2 rounded">
                             <span className="font-bold text-emerald-800 uppercase">Total a Pagar</span>
                             <span className="font-black text-xl text-emerald-700">{formatBRL(darjResult.valores.totalGuia || resultado.resumo.totalIcmsStCalculado)}</span>
                          </div>
                       </div>
                       )}

                       <div className="w-full max-w-lg space-y-3">
                          <div className="flex flex-col gap-1 bg-white p-3 rounded border shadow-sm">
                             <span className="text-xs text-emerald-700 font-semibold uppercase">Nosso Número (SEFAZ)</span>
                             <span className="font-mono text-lg text-slate-800 tracking-wider">{darjResult.nossoNumero || darjResult.idSessao}</span>
                          </div>

                          <div className="flex flex-col gap-1 bg-white p-3 rounded border shadow-sm">
                             <span className="text-xs text-emerald-700 font-semibold uppercase">Código de Barras</span>
                             <span className="font-mono text-sm text-slate-800 break-all">{darjResult.codigoBarra}</span>
                          </div>

                          {darjResult.pixCopiaCola && (
                          <div className="flex flex-col gap-1 bg-white p-3 rounded border shadow-sm">
                             <span className="text-xs text-emerald-700 font-semibold uppercase">Pix Copia e Cola</span>
                             <span className="font-mono text-xs text-slate-800 break-all max-h-24 overflow-y-auto">{darjResult.pixCopiaCola}</span>
                          </div>
                          )}
                       </div>
                    </div>
                    )}
                    
                    <DialogFooter className="sm:justify-between border-t pt-4 mt-2">
                       <Button type="button" variant="outline" onClick={() => { setModalDarjOpen(false); setDarjResult(null); }}>
                          {darjResult ? 'Fechar' : 'Cancelar'}
                       </Button>
                       
                       {!darjResult && (
                       <Button 
                          type="button" 
                          onClick={handleGerarDarj} 
                          disabled={gerandoDarj || !dataDarj || !dataVencimento}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px]"
                       >
                          {gerandoDarj ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando na SEFAZ...</> : 'Confirmar e Enviar para SEFAZ'}
                       </Button>
                       )}
                    </DialogFooter>
                 </DialogContent>
              </Dialog>
           </div>
           
           {/* Legendas Clicáveis */}
            <div className="flex items-center gap-4 text-xs font-medium mt-2">
               <button 
                  onClick={() => toggleStatusFiltro('Todos')}
                  className={`flex items-center gap-1.5 transition-all hover:opacity-80 ${filtroStatus === 'Todos' ? 'text-indigo-600 font-bold' : 'text-slate-700'}`}
               >
                  <div className={`w-3 h-3 rounded-full ${filtroStatus === 'Todos' ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>Todos
               </button>
               <button 
                  onClick={() => toggleStatusFiltro('Com Valor a Recolher')}
                  className={`flex items-center gap-1.5 transition-all hover:opacity-80 ${filtroStatus === 'Com Valor a Recolher' ? 'text-amber-600 font-bold' : 'text-slate-700'}`}
               >
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>Com Valor a Recolher
               </button>
               <button 
                  onClick={() => toggleStatusFiltro('Sem Valor a Recolher')}
                  className={`flex items-center gap-1.5 transition-all hover:opacity-80 ${filtroStatus === 'Sem Valor a Recolher' ? 'text-slate-800 font-bold' : 'text-slate-700'}`}
               >
                  <div className="w-3 h-3 rounded-full bg-slate-400"></div>Sem Valor a Recolher
               </button>
               <button 
                  onClick={() => toggleStatusFiltro('Não Calculado')}
                  className={`flex items-center gap-1.5 transition-all hover:opacity-80 ${filtroStatus === 'Não Calculado' ? 'text-rose-600 font-bold' : 'text-slate-700'}`}
               >
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>Não Calculado
               </button>
            </div>
        </div>

        {/* Tabela de Itens */}
        <div className="border rounded-md shadow-sm overflow-x-auto bg-white">
          <table className="w-full text-xs text-left min-w-[1500px]">
            <thead className="bg-slate-50 border-b font-semibold text-slate-700">
              <tr>
                <th className="p-3 w-2"></th>
                <th className="p-3">Nota</th>
                <th className="p-3">Data</th>
                <th className="p-3 min-w-[200px]">Descrição</th>
                <th className="p-3">NCM</th>
                <th className="p-3">CEST</th>
                <th className="p-3">CFOP</th>
                <th className="p-3">CST</th>
                <th className="p-3 text-right">Valor Item</th>
                <th className="p-3 text-right">IPI</th>
                <th className="p-3 text-right">Frete</th>
                <th className="p-3 text-right">Seguro</th>
                <th className="p-3 text-right">Desconto</th>
                <th className="p-3 text-right">Outras Desp.</th>
                <th className="p-3 text-right font-bold">Valor Total Item</th>
                <th className="p-3 text-right">BC ICMS</th>
                <th className="p-3 text-right">Alíquota ICMS</th>
                <th className="p-3 text-right">ICMS Próprio</th>
                <th className="p-3 text-right">BC ST</th>
                <th className="p-3 text-right">Alíquota ICMS ST</th>
                <th className="p-3 text-right">ICMS ST Destacado</th>
                <th className="p-3 text-right font-bold text-indigo-600">MVA</th>
                <th className="p-3 text-right font-bold text-indigo-600">BC ST Calculado</th>
                <th className="p-3 text-right font-bold text-indigo-600">Ali.Interna+ FECOEP</th>
                <th className="p-3 text-right font-bold text-indigo-600">Valor ST Calculado</th>
                <th className="p-3 text-right font-bold text-emerald-600">ICMS ST Puro (20%)</th>
                <th className="p-3 text-right font-bold text-emerald-600">FECP ST (2%)</th>
                <th className="p-3 text-right font-black text-amber-600">Dif. Recolher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensFiltrados.map((item: any, idx: number) => {
                let bulletColor = 'bg-slate-300'; // Sem Valor a Recolher
                if (item.status === 'Com Valor a Recolher') bulletColor = 'bg-amber-400';
                if (item.status === 'Não Calculado') bulletColor = 'bg-rose-500';

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-0 pl-1"><div className={`w-1 h-full py-4 ${bulletColor} rounded-r-md`}></div></td>
                    <td className="p-3 font-medium text-indigo-600 flex items-center gap-1">
                      {item.nota}
                      {item.status === 'Não Calculado' ? (
                        <div 
                          onClick={() => toast.info("A NCM/CEST informado não foi encontrada em nossa base de dados. Baseado nos demais dados do documento fiscal, verifique nossas sugestões ao editar o registro. Caso as sugestões não se enquadrem ao seu produto, basta não selecionar, pois seu produto não está sujeito ao regime de substituição tributária", { duration: 8000 })}
                          className="w-4 h-4 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer" 
                          title="A NCM/CEST informado não foi encontrada em nossa base de dados. Clique para ver mais."
                        >i</div>
                      ) : item.alerta && (
                        <div 
                          onClick={() => toast.info(item.alerta, { duration: 8000 })}
                          className="w-4 h-4 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer" 
                          title="Alerta da Regra Fiscal. Clique para ler."
                        >i</div>
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{item.data.split('-').reverse().join('/')}</td>
                    <td className="p-3 truncate max-w-[200px]" title={item.descricao}>{item.descricao}</td>
                    <td className="p-3 text-slate-600">{item.ncm}</td>
                    <td className="p-3 text-slate-600">{item.cest || '-'}</td>
                    <td className="p-3 text-slate-600">{item.cfop}</td>
                    <td className="p-3 text-slate-600">{item.cst}</td>
                    
                    <td className="p-3 text-right text-slate-600">{formatBRL(item.valorItem)}</td>
                    <td className="p-3 text-right text-slate-500">{item.ipi > 0 ? formatBRL(item.ipi) : '-'}</td>
                    <td className="p-3 text-right text-slate-500">{item.frete > 0 ? formatBRL(item.frete) : '-'}</td>
                    <td className="p-3 text-right text-slate-500">{item.seguro > 0 ? formatBRL(item.seguro) : '-'}</td>
                    <td className="p-3 text-right text-slate-500">{item.desconto > 0 ? formatBRL(item.desconto) : '-'}</td>
                    <td className="p-3 text-right text-slate-500">{item.outrasDespesas > 0 ? formatBRL(item.outrasDespesas) : '-'}</td>
                    
                    <td className="p-3 text-right font-bold text-slate-800">{formatBRL(item.valorTotalItem)}</td>
                    <td className="p-3 text-right text-slate-600">{item.bcIcms > 0 ? formatBRL(item.bcIcms) : '-'}</td>
                    <td className="p-3 text-right text-slate-600">{item.aliquotaIcms > 0 ? formatPct(item.aliquotaIcms) : '-'}</td>
                    <td className="p-3 text-right text-slate-600">{item.icmsProprio > 0 ? formatBRL(item.icmsProprio) : '-'}</td>
                    
                    <td className="p-3 text-right text-slate-600">{item.bcSt > 0 ? formatBRL(item.bcSt) : '-'}</td>
                    <td className="p-3 text-right text-slate-600">{item.aliquotaIcmsSt > 0 ? formatPct(item.aliquotaIcmsSt) : '-'}</td>
                    <td className="p-3 text-right text-slate-600">{item.icmsSt > 0 ? formatBRL(item.icmsSt) : '-'}</td>
                    
                    {/* Campos Calculados */}
                    <td className="p-3 text-right font-semibold text-indigo-700 bg-indigo-50/30">{item.mva > 0 ? formatPct(item.mva) : '-'}</td>
                    <td className="p-3 text-right font-semibold text-indigo-700 bg-indigo-50/30">{item.bcStCalculado > 0 ? formatBRL(item.bcStCalculado) : '-'}</td>
                    <td className="p-3 text-right font-semibold text-indigo-700 bg-indigo-50/30">{item.aliInternaFecoep ? formatPct(item.aliInternaFecoep) : '-'}</td>
                    <td className="p-3 text-right font-semibold text-indigo-700 bg-indigo-50/30">{item.valorSt > 0 ? formatBRL(item.valorSt) : '-'}</td>
                    <td className="p-3 text-right font-semibold text-emerald-700 bg-emerald-50/30">{item.icms_st_puro_calculado > 0 ? formatBRL(item.icms_st_puro_calculado) : '-'}</td>
                    <td className="p-3 text-right font-semibold text-emerald-700 bg-emerald-50/30">{item.fecp_st_calculado > 0 ? formatBRL(item.fecp_st_calculado) : '-'}</td>
                    
                    <td className="p-3 text-right font-black text-amber-700 bg-amber-50/50">{item.difRecolher > 0 ? formatBRL(item.difRecolher) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Tela Inicial de Upload ou Histórico
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Conferência ICMS - ST</h2>
        <p className="text-muted-foreground text-sm">
          Valide o valor do ICMS-ST informado no documento fiscal de aquisição ou realize o cálculo deste imposto quando for devido pela entrada.
        </p>
        <p className="text-xs text-slate-500">
          Com esta ferramenta é possível validar a aplicação da regra geral da substituição tributária, calculada por MVA, sem a aplicação de benefícios fiscais.
        </p>
      </div>

      <Card className="shadow-sm border-t-4 border-t-indigo-600">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-8 border-b pb-4">
             <button 
                onClick={() => setActiveTab('nova')}
                className={`font-semibold text-sm pb-4 -mb-[18px] transition-colors ${activeTab === 'nova' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
             >
                Nova Consulta
             </button>
             <button 
                onClick={() => setActiveTab('historico')}
                className={`font-semibold text-sm pb-4 -mb-[18px] transition-colors ${activeTab === 'historico' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
             >
                Histórico
             </button>
          </div>

          {activeTab === 'nova' ? (
            <>
              <div className="max-w-xl mb-8 relative z-50">
                <Label className="text-sm font-semibold mb-2 block text-slate-700">Selecione a Empresa</Label>
                <CompanySelector 
                  value={empresaId} 
                  onChange={(val, name) => { setEmpresaId(val); setEmpresaNome(name); }} 
                />
              </div>

          {arquivos.length === 0 ? (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center bg-slate-50/50">
              <div className="bg-sky-100 p-4 rounded-full mb-4">
                 <Upload className="h-8 w-8 text-sky-500" />
              </div>
              <h3 className="text-xl font-medium text-sky-500 mb-2">Enviar arquivos</h3>
              <p className="text-sm text-slate-500 mb-1">Arraste aqui ou clique no botão abaixo para enviar</p>
              <p className="text-sm text-slate-500 mb-6">notas fiscais (XML) de entrada da sua empresa</p>
              <p className="text-xs text-slate-400 italic mb-6">Arquivos suportados: XML, ZIP e RAR</p>
              
              <div className="relative">
                <input 
                  type="file" 
                  multiple 
                  accept=".xml" 
                  onChange={handleFileUpload} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button className="bg-slate-800 hover:bg-slate-700 text-white px-8 pointer-events-none">
                  Selecionar Arquivos
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <input 
                    type="file" 
                    multiple 
                    accept=".xml" 
                    onChange={handleFileUpload} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" className="w-full justify-start text-slate-600 font-medium pointer-events-none">
                     <Plus className="h-4 w-4 mr-2" /> Adicionar mais arquivos
                  </Button>
                </div>
              </div>

              <div className="border rounded-md">
                 <div className="flex items-center p-3 bg-slate-50 border-b text-sm font-semibold text-slate-600">
                    <div className="w-12 text-center">
                       <input type="checkbox" className="rounded border-slate-300" />
                    </div>
                    <div className="flex-1">Arquivos</div>
                    <div className="w-24 text-center">Ação</div>
                 </div>
                 <div className="divide-y">
                   {arquivos.map((arq, idx) => (
                     <div key={idx} className="flex items-center p-3 text-sm text-slate-600 hover:bg-slate-50">
                        <div className="w-12 text-center">
                          <input type="checkbox" className="rounded border-slate-300" />
                        </div>
                        <div className="flex-1 flex items-center gap-2 font-mono">
                           <FileText className="h-4 w-4 text-slate-400" />
                           {arq.name}
                        </div>
                        <div className="w-24 flex justify-center">
                           <Button variant="ghost" size="icon" onClick={() => removerArquivo(idx)} className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600">
                              <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>

              <div className="flex justify-center mt-8">
                 <Button 
                   onClick={handleConfirmarEnvio} 
                   disabled={loading}
                   className="bg-slate-800 hover:bg-slate-700 text-white px-12 h-12 text-base font-medium shadow-md"
                 >
                   {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Upload className="h-5 w-5 mr-2" />}
                   Confirmar Envio
                 </Button>
              </div>
            </div>
          )}
          </>
          ) : (
            <div className="border rounded-md shadow-sm bg-white overflow-hidden">
               {loading ? (
                 <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 text-slate-400 animate-spin" /></div>
               ) : historico.length === 0 ? (
                 <div className="p-12 text-center text-slate-400">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Nenhuma conferência realizada ainda.</p>
                 </div>
               ) : (
                 <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b font-semibold text-slate-700">
                       <tr>
                          <th className="p-4">Consulta #</th>
                          <th className="p-4">Empresa</th>
                          <th className="p-4">Data da consulta</th>
                          <th className="p-4 text-center">Arquivos enviados</th>
                          <th className="p-4 text-center">Arquivos válidos</th>
                          <th className="p-4 text-center">Arquivos inválidos</th>
                          <th className="p-4 text-center">Usuário</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {historico.map(h => (
                          <tr key={h.consulta_id} onClick={() => { setEmpresaId(h.empresa_id?.toString() || ''); setEmpresaNome(h.empresa); setResultado(h.resultado_json); }} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                             <td className="p-4 font-medium text-slate-600 flex items-center gap-2">
                               {h.consulta_id} 
                               <Eye className="h-4 w-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                             </td>
                             <td className="p-4 text-slate-600">{h.empresa}</td>
                             <td className="p-4 text-slate-500">{new Date(h.data_consulta).toLocaleDateString('pt-BR')} {new Date(h.data_consulta).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'})}</td>
                             <td className="p-4 text-center text-slate-600">{h.arquivos_enviados}</td>
                             <td className="p-4 text-center text-emerald-600 font-medium">{h.arquivos_validos}</td>
                             <td className="p-4 text-center text-slate-400">{h.arquivos_invalidos}</td>
                             <td className="p-4 text-center text-slate-500">{h.user_name}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
               )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
