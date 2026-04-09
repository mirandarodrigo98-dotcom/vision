'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyDollarIcon, MagnifyingGlassIcon, DocumentArrowDownIcon, ChevronDoubleLeftIcon, EyeIcon, FunnelIcon, CheckCircleIcon, DocumentMagnifyingGlassIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { listarContasReceber, obterBoletoOmie, downloadBoletoPdfServer, lancarRecebimentoOmie, consultarContaReceberOmie, cancelarRecebimentoOmie, enviarBoletoDigisacOmie, enviarCobrancaDigisacOmie } from '@/app/actions/integrations/omie';
import { toast } from 'sonner';

import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { AG_GRID_LOCALE_PT_BR } from '@/lib/ag-grid-locale-pt-br';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Registra todos os recursos gratuitos do AG Grid (necessário na v35+)
ModuleRegistry.registerModules([AllCommunityModule]);

const CustomHeader = (props: any) => {
  const [sort, setSort] = useState<string | undefined>();

  const onSortRequested = (event: any) => {
    props.progressSort(event.shiftKey);
  };

  const onHideClick = (e: any) => {
    e.stopPropagation();
    props.api.setColumnsVisible([props.column.getColId()], false);
  };

  useEffect(() => {
    const listener = () => {
      if (props.column.isSortAscending()) setSort('asc');
      else if (props.column.isSortDescending()) setSort('desc');
      else setSort(undefined);
    };
    props.column.addEventListener('sortChanged', listener);
    return () => props.column.removeEventListener('sortChanged', listener);
  }, [props.column]);

  return (
    <div className="flex items-center justify-between w-full group">
      <div className="flex items-center cursor-pointer flex-1 overflow-hidden" onClick={onSortRequested}>
        <span className="truncate font-semibold text-xs text-muted-foreground uppercase">{props.displayName}</span>
        {sort === 'asc' && <span className="ml-1 text-xs">▲</span>}
        {sort === 'desc' && <span className="ml-1 text-xs">▼</span>}
      </div>
      <div 
        className="cursor-pointer px-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity" 
        onClick={onHideClick}
        title="Ocultar coluna"
      >
        &laquo;
      </div>
    </div>
  );
};

const CustomFloatingFilter = (props: any) => {
  const [currentValue, setCurrentValue] = useState('');
  const [operator, setOperator] = useState('contains');

  useEffect(() => {
    if (!props.model) {
      setCurrentValue('');
    } else {
      setCurrentValue(props.model.filter?.toString() || '');
      setOperator(props.model.type || 'contains');
    }
  }, [props.model]);

  const updateModel = (op: string, val: string) => {
    if (val === '') {
      props.onModelChange(null);
    } else {
      const isNumber = props.column.getColDef().filter === 'agNumberColumnFilter';
      props.onModelChange({
        filterType: isNumber ? 'number' : 'text',
        type: op,
        filter: isNumber ? Number(val) : val
      });
    }
  };

  const onInputChanged = (e: any) => {
    const val = e.target.value;
    setCurrentValue(val);
    updateModel(operator, val);
  };

  const onOperatorChanged = (op: string) => {
    setOperator(op);
    updateModel(op, currentValue);
  };

  return (
    <div className="flex items-center w-full h-full gap-1 pt-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-muted-foreground hover:text-primary outline-none flex items-center justify-center p-1 cursor-pointer">
            <FunnelIcon className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 z-[9999]">
          <DropdownMenuItem onClick={() => onOperatorChanged('contains')} className={operator === 'contains' ? 'bg-accent' : ''}>Contém</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOperatorChanged('notContains')} className={operator === 'notContains' ? 'bg-accent' : ''}>Não contém</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOperatorChanged('equals')} className={operator === 'equals' ? 'bg-accent' : ''}>Igual a</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOperatorChanged('notEqual')} className={operator === 'notEqual' ? 'bg-accent' : ''}>Diferente de</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOperatorChanged('startsWith')} className={operator === 'startsWith' ? 'bg-accent' : ''}>Começa com</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOperatorChanged('endsWith')} className={operator === 'endsWith' ? 'bg-accent' : ''}>Termina com</DropdownMenuItem>
          <div className="h-px bg-border my-1"></div>
          <DropdownMenuItem onClick={() => { setCurrentValue(''); props.onModelChange(null); }}>Limpar filtro</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input 
        type="text" 
        value={currentValue} 
        onChange={onInputChanged} 
        className="flex-1 outline-none border border-input rounded-sm px-2 h-7 text-sm min-w-0 focus:border-primary placeholder:text-muted-foreground"
        placeholder="Filtrar..."
      />
    </div>
  );
};

export default function CobrancaPage() {
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [loading, setLoading] = useState(false);
  const [contas, setContas] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [gridApi, setGridApi] = useState<any>(null);
  const [hiddenColumns, setHiddenColumns] = useState<{ id: string, name: string }[]>([]);
  const [contasCorrentes, setContasCorrentes] = useState<any[]>([]);

  // Receber Dialog State
  const [isReceberOpen, setIsReceberOpen] = useState(false);
  const [recContaCorrente, setRecContaCorrente] = useState('');
  const [recData, setRecData] = useState(new Date().toISOString().split('T')[0]);
  const [recValor, setRecValor] = useState('');
  const [recDesconto, setRecDesconto] = useState('0.00');
  const [recJuros, setRecJuros] = useState('0.00');
  const [recMulta, setRecMulta] = useState('0.00');
  const [recObs, setRecObs] = useState('');
  const [isRecebendo, setIsRecebendo] = useState(false);

  // Detalhar Dialog State
  const [isDetalharOpen, setIsDetalharOpen] = useState(false);
  const [detalheConta, setDetalheConta] = useState<any>(null);
  const [isCarregandoDetalhes, setIsCarregandoDetalhes] = useState(false);

  const [isSendingDigisac, setIsSendingDigisac] = useState(false);
  const [isSendingCobranca, setIsSendingCobranca] = useState(false);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  };

  const columnDefs = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      pinned: 'left',
      suppressHeaderMenuButton: true,
      suppressMovable: true,
      sortable: false,
      filter: false,
      headerComponent: undefined
    },
    {
      field: 'status_titulo',
      headerName: 'Situação',
      width: 130,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: any) => {
        const status = params.value || 'PENDENTE';
        let badgeClass = 'bg-yellow-100 text-yellow-800';
        if (status === 'RECEBIDO' || status === 'LIQUIDADO') badgeClass = 'bg-green-100 text-green-800';
        if (status === 'ATRASADO') badgeClass = 'bg-red-100 text-red-800';
        if (status === 'CANCELADO') badgeClass = 'bg-gray-100 text-gray-800';
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
            {status}
          </span>
        );
      }
    },
    { field: 'nome_cliente', headerName: 'Cliente (Razão Social)', flex: 1, filter: 'agTextColumnFilter', minWidth: 200 },
    { field: 'data_emissao', headerName: 'Data Emissão', width: 140, filter: 'agTextColumnFilter' },
    { field: 'data_vencimento', headerName: 'Vencimento', width: 140, filter: 'agTextColumnFilter' },
    { 
      field: 'data_pagamento_calculada', 
      headerName: 'Último Receb.', 
      width: 140, 
      filter: 'agTextColumnFilter',
      valueGetter: (p: any) => p.data.data_pagamento_calculada || '-'
    },
    { 
      field: 'valor_documento', 
      headerName: 'Valor Conta', 
      width: 130, 
      filter: 'agNumberColumnFilter',
      valueFormatter: (p: any) => formatNumber(p.value),
      cellClass: 'text-right'
    },
    { 
      field: 'valor_pago_calculado', 
      headerName: 'Recebido', 
      width: 130, 
      filter: 'agNumberColumnFilter',
      valueGetter: (p: any) => p.data.valor_pago_calculado || 0,
      valueFormatter: (p: any) => formatNumber(p.value),
      cellClass: 'text-right text-green-600 font-medium'
    },
    { 
      field: 'saldo_a_receber', 
      headerName: 'A Receber', 
      width: 130, 
      filter: 'agNumberColumnFilter',
      valueGetter: (p: any) => {
        const doc = p.data.valor_documento || 0;
        const pago = p.data.valor_pago_calculado || 0;
        return doc - pago;
      },
      valueFormatter: (p: any) => formatNumber(p.value),
      cellClass: 'text-right text-orange-600 font-medium'
    },
    { 
      field: 'valor_desconto', 
      headerName: 'Desconto', 
      width: 120, 
      filter: 'agNumberColumnFilter',
      valueGetter: (p: any) => p.data.valor_desconto || p.data.resumo?.desconto || 0,
      valueFormatter: (p: any) => formatNumber(p.value),
      cellClass: 'text-right text-red-500'
    },
    { 
      field: 'valor_juros', 
      headerName: 'Juros', 
      width: 120, 
      filter: 'agNumberColumnFilter',
      valueGetter: (p: any) => p.data.valor_juros || p.data.resumo?.juros || 0,
      valueFormatter: (p: any) => formatNumber(p.value),
      cellClass: 'text-right text-red-500'
    },
    { field: 'nome_categoria', headerName: 'Categoria', width: 180, filter: 'agTextColumnFilter' },
    { field: 'nome_conta_corrente', headerName: 'Conta Corrente', width: 180, filter: 'agTextColumnFilter' },
    { field: 'numero_boleto', headerName: 'Nº Boleto', width: 130, filter: 'agTextColumnFilter' },
    { field: 'codigo_barras', headerName: 'Código de Barras', width: 250, filter: 'agTextColumnFilter' },
    { field: 'tipo_documento', headerName: 'Tipo Doc.', width: 120, filter: 'agTextColumnFilter' }
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    floatingFilter: true,
    suppressHeaderMenuButton: true,
    suppressFloatingFilterButton: true,
    floatingFilterComponent: CustomFloatingFilter,
    headerComponent: CustomHeader,
  }), []);

  const onGridReady = (params: any) => {
    setGridApi(params.api);
  };

  const onDisplayedColumnsChanged = (params: any) => {
    const allCols = params.api.getColumns();
    if (allCols) {
      const hidden = allCols.filter((col: any) => !col.isVisible() && col.getColDef().headerName).map((col: any) => ({
        id: col.getColId(),
        name: col.getColDef().headerName
      }));
      setHiddenColumns(hidden);
    }
  };

  const unhideColumn = (colId: string) => {
    if (gridApi) {
      gridApi.setColumnsVisible([colId], true);
    }
  };

  const onSelectionChanged = (params: any) => {
    setSelectedRows(params.api.getSelectedRows());
  };

  const handleReceberClick = () => {
    if (selectedRows.length !== 1) return;
    const conta = selectedRows[0];
    const saldo = (conta.valor_documento || 0) - (conta.valor_pago_calculado || 0);
    
    if (saldo <= 0) {
      toast.warning('Este título já está totalmente recebido.');
      return;
    }
    
    setRecValor(saldo.toFixed(2));
    setRecDesconto('0.00');
    setRecJuros('0.00');
    setRecMulta('0.00');
    setRecContaCorrente(conta.id_conta_corrente?.toString() || '');
    setRecData(new Date().toISOString().split('T')[0]);
    setRecObs(`Recebimento realizado por Usuário em ${new Date().toLocaleString('pt-BR')} através da integração com o Vision ERP`);
    
    setIsReceberOpen(true);
  };

  const handleConfirmarRecebimento = async () => {
    if (!recContaCorrente) {
      toast.error('Selecione uma conta corrente.');
      return;
    }
    
    setIsRecebendo(true);
    try {
      const conta = selectedRows[0];
      const payload = {
        codigo_lancamento: conta.codigo_lancamento_omie,
        codigo_conta_corrente: Number(recContaCorrente),
        valor: Number(recValor),
        desconto: Number(recDesconto),
        juros: Number(recJuros),
        multa: Number(recMulta),
        data: recData.split('-').reverse().join('/'),
        observacao: recObs
      };
      
      const res = await lancarRecebimentoOmie(payload);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Recebimento registrado com sucesso!');
        setIsReceberOpen(false);
        // Recarregar a grid
        handleSearch(new Event('submit') as any);
      }
    } catch (error) {
      toast.error('Erro ao registrar recebimento.');
    } finally {
      setIsRecebendo(false);
    }
  };

  const handleDetalharClick = async () => {
    if (selectedRows.length !== 1) return;
    const conta = selectedRows[0];
    
    setIsCarregandoDetalhes(true);
    setIsDetalharOpen(true);
    setDetalheConta(null);
    
    try {
      const res = await consultarContaReceberOmie(conta.codigo_lancamento_omie);
      if (res.error) {
        toast.error(res.error);
        setIsDetalharOpen(false);
      } else {
        setDetalheConta(res.data);
      }
    } catch (error) {
      toast.error('Erro ao consultar detalhes.');
      setIsDetalharOpen(false);
    } finally {
      setIsCarregandoDetalhes(false);
    }
  };

  const handleCancelarRecebimento = async (codigoBaixa: number) => {
    if (!confirm('Deseja realmente cancelar este recebimento?')) return;
    
    try {
      const res = await cancelarRecebimentoOmie(codigoBaixa);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Recebimento cancelado com sucesso!');
        // Atualizar os detalhes
        setIsCarregandoDetalhes(true);
        const refresh = await consultarContaReceberOmie(selectedRows[0].codigo_lancamento_omie);
        if (!refresh.error) setDetalheConta(refresh.data);
        setIsCarregandoDetalhes(false);
        
        // Recarregar grid principal
        handleSearch(new Event('submit') as any);
      }
    } catch (error) {
      toast.error('Erro ao cancelar recebimento.');
    }
  };

  const handleEnviarDigisac = async () => {
    if (selectedRows.length !== 1) return;
    const conta = selectedRows[0];
    
    setIsSendingDigisac(true);
    toast.info('Buscando informações e enviando boleto via Digisac...');
    
    try {
      const res = await enviarBoletoDigisacOmie(conta);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Boleto enviado com sucesso via Digisac!');
      }
    } catch (error) {
      toast.error('Erro ao processar envio do boleto.');
    } finally {
      setIsSendingDigisac(false);
    }
  };

  const handleEnviarCobranca = async () => {
    if (selectedRows.length !== 1) return;
    const conta = selectedRows[0];
    
    if (conta.status_titulo !== 'ATRASADO') {
      toast.error('A cobrança só pode ser enviada para títulos com status ATRASADO.');
      return;
    }
    
    setIsSendingCobranca(true);
    toast.info('Enviando mensagem de cobrança via Digisac...');
    
    try {
      const res = await enviarCobrancaDigisacOmie(conta);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Mensagem de cobrança enviada com sucesso!');
      }
    } catch (error) {
      toast.error('Erro ao enviar mensagem de cobrança.');
    } finally {
      setIsSendingCobranca(false);
    }
  };

  const handleVisualizarBoleto = async () => {
    if (selectedRows.length === 0) return;
    
    toast.info(`Processando ${selectedRows.length} boleto(s)... Isso pode demorar alguns segundos.`);
    
    let successCount = 0;
    let failCount = 0;

    if (selectedRows.length === 1) {
      // Abre direto na aba
      const conta = selectedRows[0];
      if (!conta.boleto || conta.boleto.cGerado !== 'S') {
        toast.error('Este título não possui um boleto gerado no Omie.');
        return;
      }
      try {
        let pdfUrl = conta.cLinkBoleto;
        if (!pdfUrl) {
          const response = await obterBoletoOmie(conta.codigo_lancamento_omie);
          if (response.error) {
            toast.error(response.error);
            return;
          } else if (response.data && response.data.cLinkBoleto) {
            pdfUrl = response.data.cLinkBoleto;
          } else {
            toast.warning('O PDF do boleto não está disponível. Código de Barras: ' + (conta.codigo_barras || 'Não disponível'));
            return;
          }
        }
        
        // Abre na nova aba
        window.open(pdfUrl, '_blank');
      } catch (error) {
        toast.error('Erro ao visualizar boleto.');
      }
    } else {
      // Baixar vários em ZIP
      const zip = new JSZip();
      const folder = zip.folder('Boletos');

      for (const conta of selectedRows) {
        if (!conta.boleto || conta.boleto.cGerado !== 'S') {
          failCount++;
          continue;
        }

        try {
          let pdfUrl = conta.cLinkBoleto;
          
          if (!pdfUrl) {
            const response = await obterBoletoOmie(conta.codigo_lancamento_omie);
            if (!response.error && response.data && response.data.cLinkBoleto) {
              pdfUrl = response.data.cLinkBoleto;
            }
          }

          if (pdfUrl) {
            try {
              const pdfData = await downloadBoletoPdfServer(pdfUrl);
              if (pdfData.error || !pdfData.base64) throw new Error(pdfData.error || 'Base64 vazio');
              
              const byteCharacters = atob(pdfData.base64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
              
              const safeNome = (conta.nome_cliente || '').replace(/[^a-z0-9]/gi, '_');
              const safeCnpj = (conta.cnpj_cliente || '').replace(/[^a-z0-9]/gi, '');
              const safeNossoNum = (conta.numero_boleto || '').replace(/[^a-z0-9]/gi, '_');
              const fileName = `${safeNome}_${safeCnpj}_${safeNossoNum}`.replace(/_+/g, '_').replace(/^_|_$/g, '') + '.pdf';
              
              folder?.file(fileName, pdfBlob);
              successCount++;
            } catch (error) {
              const safeNome = (conta.nome_cliente || '').replace(/[^a-z0-9]/gi, '_');
              const safeCnpj = (conta.cnpj_cliente || '').replace(/[^a-z0-9]/gi, '');
              const safeNossoNum = (conta.numero_boleto || '').replace(/[^a-z0-9]/gi, '_');
              const fileName = `${safeNome}_${safeCnpj}_${safeNossoNum}`.replace(/_+/g, '_').replace(/^_|_$/g, '') + '.txt';
              
              const textContent = `Link para acessar o boleto:\n${pdfUrl}`;
              folder?.file(fileName, textContent);
              successCount++;
            }
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      if (successCount > 0) {
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'Boletos.zip');
        toast.success(`${successCount} boleto(s) compactado(s) com sucesso.`);
      }
      if (failCount > 0) {
        toast.warning(`${failCount} título(s) não possuem boleto gerado ou falharam no download.`);
      }
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataDe || !dataAte) {
      toast.error('Preencha as datas de início e fim.');
      return;
    }

    setLoading(true);
    try {
      const deParts = dataDe.split('-');
      const ateParts = dataAte.split('-');
      const formattedDe = `${deParts[2]}/${deParts[1]}/${deParts[0]}`;
      const formattedAte = `${ateParts[2]}/${ateParts[1]}/${ateParts[0]}`;

      const response = await listarContasReceber(formattedDe, formattedAte);

      if (response.contasCorrentes) {
        setContasCorrentes(response.contasCorrentes);
      }

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
      <style>{`
        .ag-theme-alpine .ag-row-selected {
          background-color: #ffedd5 !important;
        }
      `}</style>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>Lista de contas a receber do período selecionado.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hiddenColumns.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 text-orange-500 border-orange-500 hover:bg-orange-50">
                    <EyeIcon className="h-4 w-4" />
                    Mostrar Colunas ({hiddenColumns.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {hiddenColumns.map(col => (
                    <DropdownMenuItem key={col.id} onClick={() => unhideColumn(col.id)}>
                      {col.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button 
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              disabled={selectedRows.length !== 1} 
              onClick={handleDetalharClick}
            >
              <DocumentMagnifyingGlassIcon className="h-4 w-4" />
              Detalhar
            </Button>
            <Button 
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              disabled={selectedRows.length !== 1 || (selectedRows[0]?.valor_documento || 0) - (selectedRows[0]?.valor_pago_calculado || 0) <= 0} 
              onClick={handleReceberClick}
            >
              <CheckCircleIcon className="h-4 w-4" />
              Receber
            </Button>
            <Button 
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              disabled={selectedRows.length !== 1 || isSendingDigisac} 
              onClick={handleEnviarDigisac}
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              {isSendingDigisac ? 'Enviando...' : 'Boleto via Digisac'}
            </Button>
            <Button 
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
              disabled={selectedRows.length !== 1 || isSendingCobranca || selectedRows[0]?.status_titulo !== 'ATRASADO'} 
              onClick={handleEnviarCobranca}
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              {isSendingCobranca ? 'Enviando...' : 'Enviar Cobrança'}
            </Button>
            <Button 
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white"
              disabled={selectedRows.length === 0} 
              onClick={handleVisualizarBoleto}
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              Visualizar Boleto {selectedRows.length > 0 ? `(${selectedRows.length})` : ''}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="ag-theme-alpine w-full h-[500px]">
            <AgGridReact
              rowData={contas}
              columnDefs={columnDefs as any}
              defaultColDef={defaultColDef}
              animateRows={true}
              rowSelection="multiple"
              onGridReady={onGridReady}
              onDisplayedColumnsChanged={onDisplayedColumnsChanged}
              onSelectionChanged={onSelectionChanged}
              localeText={AG_GRID_LOCALE_PT_BR}
              rowClassRules={{
                'bg-orange-100': (params) => params.node.isSelected()
              }}
              overlayNoRowsTemplate={
                loading ? 'Buscando registros...' : 'Nenhum registro encontrado. Realize uma busca.'
              }
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={isReceberOpen} onOpenChange={setIsReceberOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl text-green-700">Registrar Recebimento</DialogTitle>
          </DialogHeader>
          {selectedRows.length === 1 && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Conta Corrente</Label>
                  <Select value={recContaCorrente} onValueChange={setRecContaCorrente}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta corrente" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasCorrentes.map(cc => (
                        <SelectItem key={cc.id} value={cc.id.toString()}>{cc.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data do Recebimento</Label>
                  <Input type="date" value={recData} onChange={e => setRecData(e.target.value)} />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Valor do Recebimento</Label>
                  <Input type="number" step="0.01" value={recValor} onChange={e => setRecValor(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Desconto</Label>
                  <Input type="number" step="0.01" value={recDesconto} onChange={e => setRecDesconto(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Juros</Label>
                  <Input type="number" step="0.01" value={recJuros} onChange={e => setRecJuros(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Multa</Label>
                  <Input type="number" step="0.01" value={recMulta} onChange={e => setRecMulta(e.target.value)} />
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-md flex justify-between text-sm mt-2 border border-yellow-100">
                <div className="text-center">
                  <p className="text-muted-foreground mb-1">Previsão de Recebimento</p>
                  <p className="font-medium">{selectedRows[0].data_vencimento}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground mb-1">Valor Original da Conta</p>
                  <p className="font-medium">{formatNumber(selectedRows[0].valor_documento || 0)}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground mb-1">Impostos Retidos</p>
                  <p className="font-medium">0,00</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground mb-1">Total já Recebido da Conta</p>
                  <p className="font-medium">{formatNumber(selectedRows[0].valor_pago_calculado || 0)}</p>
                </div>
              </div>

              <div className="space-y-2 mt-2">
                <Label>Observação deste Recebimento</Label>
                <Textarea rows={3} value={recObs} onChange={e => setRecObs(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceberOpen(false)}>Cancelar</Button>
            <Button className="bg-[#8cc63f] hover:bg-green-600 text-white" onClick={handleConfirmarRecebimento} disabled={isRecebendo}>
              {isRecebendo ? 'Registrando...' : 'Confirmar Recebimento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetalharOpen} onOpenChange={setIsDetalharOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalhes da Conta</DialogTitle>
          </DialogHeader>
          
          {isCarregandoDetalhes ? (
            <div className="py-12 text-center text-muted-foreground">Buscando informações detalhadas no Omie...</div>
          ) : detalheConta ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 border p-4 rounded-md bg-slate-50">
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedRows[0]?.nome_cliente}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vencimento</p>
                  <p className="font-medium">{detalheConta.data_vencimento}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p className="font-medium">{selectedRows[0]?.nome_categoria}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor da Conta</p>
                  <p className="font-medium">{formatNumber(detalheConta.valor_documento || 0)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Recebimentos Realizados</h3>
                {detalheConta.recebimentos && detalheConta.recebimentos.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 font-medium">Data do Recebimento</th>
                          <th className="px-4 py-2 font-medium">Valor Recebido</th>
                          <th className="px-4 py-2 font-medium">Desconto</th>
                          <th className="px-4 py-2 font-medium">Juros</th>
                          <th className="px-4 py-2 font-medium">Multas</th>
                          <th className="px-4 py-2 font-medium">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {detalheConta.recebimentos.map((rec: any, idx: number) => (
                          <tr key={idx} className="hover:bg-muted/50">
                            <td className="px-4 py-2">{rec.data || rec.dData}</td>
                            <td className="px-4 py-2 text-green-600">{formatNumber(rec.valor || rec.nValor || 0)}</td>
                            <td className="px-4 py-2">{formatNumber(rec.desconto || rec.nDesconto || 0)}</td>
                            <td className="px-4 py-2">{formatNumber(rec.juros || rec.nJuros || 0)}</td>
                            <td className="px-4 py-2">{formatNumber(rec.multa || rec.nMulta || 0)}</td>
                            <td className="px-4 py-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                                onClick={() => handleCancelarRecebimento(rec.codigo_baixa || rec.nCodBaixa)}
                              >
                                Cancelar Recebimento
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground border rounded-md bg-slate-50">
                    Nenhum recebimento registrado para esta conta.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">Não foi possível carregar os detalhes.</div>
          )}
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDetalharOpen(false)}>Fechar</Button>
            <Button 
              className="bg-[#8cc63f] hover:bg-green-600 text-white" 
              disabled={isCarregandoDetalhes || !detalheConta || (detalheConta.valor_documento || 0) - (detalheConta.resumo?.valor_pago || detalheConta.valor_pago || 0) <= 0}
              onClick={() => {
                setIsDetalharOpen(false);
                handleReceberClick();
              }}
            >
              Registrar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
