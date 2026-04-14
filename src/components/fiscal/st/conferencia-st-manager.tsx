'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { validarArquivosST } from '@/app/actions/fiscal/conferencia-st';
import { listarHistoricoSt } from '@/app/actions/fiscal/historico-st';
import { Loader2, Upload, FileText, Trash2, CheckCircle2, ChevronLeft, Download, History, Eye, Plus, Search, ChevronDownIcon, Receipt } from 'lucide-react';
import { CompanySelector } from '@/components/shared/company-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

  const handleGerarDarj = async () => {
    if (!resultado || !dataDarj) return;
    if (resultado.resumo.totalIcmsStPuro <= 0 && resultado.resumo.totalFecpSt <= 0) {
       toast.error('Não há valores de ST a recolher nesta conferência.');
       return;
    }

    setGerandoDarj(true);
    try {
      const res = await gerarDarjSt({
         empresaId,
         dataPagamento: dataDarj,
         totalIcmsStPuro: resultado.resumo.totalIcmsStPuro,
         totalFecpSt: resultado.resumo.totalFecpSt,
         totalGeral: resultado.resumo.totalIcmsStCalculado,
         periodoMes: parseInt(dataDarj.split('-')[1]),
         periodoAno: parseInt(dataDarj.split('-')[0])
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
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                       <Receipt className="h-4 w-4 mr-2" />
                       Gerar DARJ ST (RJ)
                    </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                       <DialogTitle>Gerar Guia DARJ - ICMS ST</DialogTitle>
                       <DialogDescription>
                          A guia será gerada diretamente no sistema da SEFAZ RJ com o CNPJ da empresa destinatária e as informações abaixo.
                       </DialogDescription>
                    </DialogHeader>
                    {!darjResult ? (
                    <div className="flex flex-col gap-4 py-4">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                             <span className="text-xs text-slate-500 font-semibold uppercase">ICMS ST Puro</span>
                             <span className="text-lg font-bold text-slate-800">{formatBRL(resultado.resumo.totalIcmsStPuro || 0)}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                             <span className="text-xs text-slate-500 font-semibold uppercase">FECP ST</span>
                             <span className="text-lg font-bold text-slate-800">{formatBRL(resultado.resumo.totalFecpSt || 0)}</span>
                          </div>
                          <div className="col-span-2 flex flex-col gap-1 pt-2 border-t border-dashed">
                             <span className="text-xs text-slate-500 font-semibold uppercase">Total da Guia</span>
                             <span className="text-xl font-black text-indigo-700">{formatBRL(resultado.resumo.totalIcmsStCalculado || 0)}</span>
                          </div>
                       </div>
                       <div className="space-y-2 mt-2">
                          <Label htmlFor="data-vencimento">Data de Pagamento/Vencimento</Label>
                          <Input 
                             id="data-vencimento" 
                             type="date" 
                             value={dataDarj}
                             onChange={e => setDataDarj(e.target.value)}
                             min={new Date().toISOString().substring(0, 10)}
                          />
                          <p className="text-xs text-slate-500 mt-1">Datas em finais de semana ou feriados podem retornar alertas ou recusas da SEFAZ.</p>
                       </div>
                    </div>
                    ) : (
                    <div className="flex flex-col gap-4 py-4 bg-emerald-50 rounded-lg p-4 mt-2 border border-emerald-100">
                       <div className="flex flex-col items-center text-center gap-2 mb-2">
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                             <CheckCircle2 className="w-8 h-8" />
                          </div>
                          <h3 className="font-bold text-emerald-800 text-lg">Guia Gerada com Sucesso</h3>
                       </div>
                       
                       <div className="flex flex-col gap-1">
                          <span className="text-xs text-emerald-700 font-semibold">Nosso Número (SEFAZ)</span>
                          <span className="font-mono text-sm bg-white p-2 rounded border">{darjResult.nossoNumero || darjResult.idSessao}</span>
                       </div>

                       <div className="flex flex-col gap-1">
                          <span className="text-xs text-emerald-700 font-semibold">Código de Barras</span>
                          <span className="font-mono text-sm bg-white p-2 rounded border break-all">{darjResult.codigoBarra}</span>
                       </div>

                       {darjResult.pixCopiaCola && (
                       <div className="flex flex-col gap-1">
                          <span className="text-xs text-emerald-700 font-semibold">Pix Copia e Cola</span>
                          <span className="font-mono text-xs bg-white p-2 rounded border break-all max-h-24 overflow-y-auto">{darjResult.pixCopiaCola}</span>
                       </div>
                       )}
                    </div>
                    )}
                    
                    <DialogFooter className="sm:justify-end">
                       {!darjResult ? (
                       <Button 
                          type="button" 
                          variant="default" 
                          onClick={handleGerarDarj} 
                          disabled={gerandoDarj || !dataDarj}
                          className="w-full sm:w-auto"
                       >
                          {gerandoDarj ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Conectando à SEFAZ...</> : 'Confirmar e Gerar'}
                       </Button>
                       ) : (
                       <Button type="button" variant="outline" onClick={() => { setModalDarjOpen(false); setDarjResult(null); }}>
                          Fechar
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
