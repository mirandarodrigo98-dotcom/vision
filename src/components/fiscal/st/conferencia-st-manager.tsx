'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { validarArquivosST } from '@/app/actions/fiscal/conferencia-st';
import { Loader2, Upload, FileText, Trash2, CheckCircle2, ChevronLeft, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCompanies } from '@/app/actions/companies';

export function ConferenciaStManager() {
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresaId, setEmpresaId] = useState<string>('');
  const [arquivos, setArquivos] = useState<{ name: string, content: string }[]>([]);
  const [resultado, setResultado] = useState<any>(null);
  
  // Filtros
  const [buscaNcmCest, setBuscaNcmCest] = useState('');

  useEffect(() => {
    const loadEmpresas = async () => {
      const res = await getCompanies();
      if (res.success && res.data) {
        setEmpresas(res.data);
      }
    };
    loadEmpresas();
  }, []);

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
      const res = await validarArquivosST(xmls, parseInt(empresaId));
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

  // Tela de Resultado
  if (resultado) {
    const itensFiltrados = resultado.itens.filter((item: any) => {
      if (!buscaNcmCest) return true;
      return item.ncm.includes(buscaNcmCest) || item.cest.includes(buscaNcmCest);
    });

    const empresaNome = empresas.find(e => e.id.toString() === empresaId)?.company_name || 'Empresa';

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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-0 border rounded-lg bg-white overflow-hidden shadow-sm">
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
          <div className="p-4 flex flex-col justify-center border-2 border-amber-400 bg-amber-50">
            <span className="text-xs font-bold text-slate-800">Diferença a Recolher</span>
            <span className="text-lg font-black text-amber-600">{formatBRL(resultado.resumo.totalDiferencaRecolher)}</span>
          </div>
        </div>

        {/* Filtros da Tabela */}
        <div className="flex items-center gap-4 mt-4">
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
             <Select defaultValue="todas">
                <SelectTrigger><SelectValue placeholder="NFes" /></SelectTrigger>
                <SelectContent><SelectItem value="todas">Todas as NFes</SelectItem></SelectContent>
             </Select>
          </div>
          <Button variant="outline" className="ml-auto border-emerald-500 text-emerald-600 hover:bg-emerald-50">
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
        </div>

        {/* Legendas */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 mt-2">
           <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400"></div>Com Valor a Recolher</span>
           <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-300"></div>Sem Valor a Recolher</span>
           <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500"></div>Não Calculado</span>
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
                <th className="p-3 text-right font-bold">Valor Total do Item</th>
                <th className="p-3 text-right">BC ICMS</th>
                <th className="p-3 text-right">Alíquota ICMS</th>
                <th className="p-3 text-right">ICMS Próprio</th>
                <th className="p-3 text-right">BC ST</th>
                <th className="p-3 text-right">Alíquota ICMS ST</th>
                <th className="p-3 text-right">ICMS ST</th>
                <th className="p-3 text-right font-bold text-indigo-600">MVA</th>
                <th className="p-3 text-right font-bold text-indigo-600">BC ST Calculado</th>
                <th className="p-3 text-right font-bold text-indigo-600">Alí.Interna+FECOEP</th>
                <th className="p-3 text-right font-bold text-indigo-600">Valor ST</th>
                <th className="p-3 text-right font-black text-rose-600">Dif. Recolher</th>
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
                      {item.alerta && (
                        <div className="w-4 h-4 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-bold cursor-help" title={item.alerta}>!</div>
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
                    <td className="p-3 text-right font-semibold text-indigo-700 bg-indigo-50/30">{item.mva > 0 ? formatBRL(item.aliInternaFecoep) : '-'}</td>
                    <td className="p-3 text-right font-semibold text-indigo-700 bg-indigo-50/30">{item.valorSt > 0 ? formatBRL(item.valorSt) : '-'}</td>
                    
                    <td className={`p-3 text-right font-bold ${item.difRecolher > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {item.difRecolher > 0 ? formatBRL(item.difRecolher) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Tela Inicial de Upload
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
             <div className="font-semibold text-sm text-indigo-600 border-b-2 border-indigo-600 pb-4 -mb-[18px]">Nova Consulta</div>
             <div className="font-semibold text-sm text-slate-400 pb-4">Histórico</div>
             <div className="font-semibold text-sm text-slate-400 pb-4">Empresas</div>
             <Button variant="outline" size="sm" className="ml-auto bg-slate-800 text-white hover:bg-slate-700">
                Cadastrar Empresa Destinatária
             </Button>
          </div>

          <div className="max-w-xl mb-8">
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger className="h-12 bg-slate-50 border-slate-200 shadow-sm text-slate-600 font-medium">
                <SelectValue placeholder="Selecione a Empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map(e => (
                  <SelectItem key={e.id} value={e.id.toString()}>{e.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </CardContent>
      </Card>
    </div>
  );
}
