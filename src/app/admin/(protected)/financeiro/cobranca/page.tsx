'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyDollarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { listarContasReceber } from '@/app/actions/integrations/omie';
import { toast } from 'sonner';

import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

export default function CobrancaPage() {
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [loading, setLoading] = useState(false);
  const [contas, setContas] = useState<any[]>([]);

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  };

  const columnDefs = useMemo(() => [
    {
      field: 'status_titulo',
      headerName: 'Situação',
      width: 130,
      filter: true,
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
    { field: 'nome_cliente', headerName: 'Cliente (Razão Social)', flex: 1, filter: true, minWidth: 200 },
    { field: 'data_emissao', headerName: 'Data Emissão', width: 140, filter: true },
    { field: 'data_vencimento', headerName: 'Vencimento', width: 140, filter: true },
    { 
      field: 'data_pagamento', 
      headerName: 'Último Receb.', 
      width: 140, 
      filter: true,
      valueGetter: (p: any) => p.data.data_pagamento || p.data.data_baixa || p.data.resumo?.data_pagamento || '-'
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
      field: 'valor_pago', 
      headerName: 'Recebido', 
      width: 130, 
      filter: 'agNumberColumnFilter',
      valueGetter: (p: any) => p.data.valor_pago || p.data.valor_baixa || p.data.resumo?.valor_pago || 0,
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
        const pago = p.data.valor_pago || p.data.valor_baixa || p.data.resumo?.valor_pago || 0;
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
    { field: 'nome_categoria', headerName: 'Categoria', width: 180, filter: true },
    { field: 'nome_conta_corrente', headerName: 'Conta Corrente', width: 180, filter: true },
    { field: 'numero_boleto', headerName: 'Nº Boleto', width: 130, filter: true },
    { field: 'tipo_documento', headerName: 'Tipo Doc.', width: 120, filter: true }
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
  }), []);

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
          <div className="ag-theme-alpine w-full h-[500px]">
            <AgGridReact
              rowData={contas}
              columnDefs={columnDefs as any}
              defaultColDef={defaultColDef}
              animateRows={true}
              rowSelection="multiple"
              overlayNoRowsTemplate={
                loading ? 'Buscando registros...' : 'Nenhum registro encontrado. Realize uma busca.'
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
