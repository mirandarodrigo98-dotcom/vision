'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { getDashboardFinanceiroData } from '@/app/actions/integrations/omie-dashboard';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DashboardFinanceiro() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async (forceRefresh = false, fullRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    
    setError('');
    const res = await getDashboardFinanceiroData(forceRefresh, fullRefresh);
    if (res.error) {
      setError(res.error);
    } else {
      setData(res.data);
    }
    
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchData(false);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-[400px] w-full items-center justify-center gap-4">
        <span className="text-red-500 font-medium">{error || 'Erro ao carregar dados do dashboard.'}</span>
        <Button onClick={() => fetchData(true)} variant="outline">Tentar Novamente</Button>
      </div>
    );
  }

  const { blocoCaixa, blocoCompetencia, blocoHonorarios } = data;

  const formatBRL = (val: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);
  const formatShortBRL = (val: any) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const formatCompactBRL = (val: any) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', compactDisplay: 'short' }).format(num);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white px-3 py-2 rounded-md text-sm font-bold shadow-md">
          {formatBRL(payload[0].value)}
        </div>
      );
    }
    return null;
  };

  const CustomLabelVertical = (props: any) => {
    const { x, y, width, height, value } = props;
    if (x === undefined || y === undefined || width === undefined || height === undefined) return null;
    if (!value || value <= 0) return null;
    
    const cx = x + width / 2;
    const cy = y + height - 10;
    
    if (isNaN(cx) || isNaN(cy)) return null;

    return (
      <text 
          x={cx} 
          y={cy} 
          fill="#ffffff" 
          fontSize={11} 
          fontWeight="bold" 
          textAnchor="start"
          transform={`rotate(-90, ${cx}, ${cy})`}
        >
        {formatShortBRL(value).replace('R$ ', '')}
      </text>
    );
  };

  const CustomLabelTop = (props: any) => {
    const { x, y, width, value } = props;
    if (x === undefined || y === undefined || width === undefined) return null;
    if (!value || value <= 0) return null;
    
    const cx = x + width / 2;
    const cy = y - 8;
    
    if (isNaN(cx) || isNaN(cy)) return null;

    return (
      <text x={cx} y={cy} fill="#64748b" fontSize={11} fontWeight="bold" textAnchor="middle">
        {formatShortBRL(value)}
      </text>
    );
  };

  const ChartRow = ({ title, dataBloco }: { title: string, dataBloco: any }) => {
    if (!dataBloco || !dataBloco.mesAtual || !dataBloco.mesAnterior || !dataBloco.ultimos12Meses) {
      return (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
          <Card className="w-full flex flex-col shadow-sm">
            <CardContent className="flex-1 min-h-[350px] flex items-center justify-center text-muted-foreground">
              Sem dados disponíveis no momento.
            </CardContent>
          </Card>
        </div>
      );
    }
    const dataMesAtual = [
      { name: dataBloco.mesAtual.labelAnoAnterior, value: dataBloco.mesAtual.anoAnterior },
      { name: dataBloco.mesAtual.labelAtual, value: dataBloco.mesAtual.atual }
    ];

    const dataMesAnterior = [
      { name: dataBloco.mesAnterior.labelAnoAnterior, value: dataBloco.mesAnterior.anoAnterior },
      { name: dataBloco.mesAnterior.labelAtual, value: dataBloco.mesAnterior.atual }
    ];

    return (
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
        
        {/* Total 12 Meses (Linha Inteira) */}
        <Card className="w-full flex flex-col shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Últimos 12 Meses</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataBloco.ultimos12Meses} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={formatCompactBRL} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80} isAnimationActive={false}>
                    <LabelList dataKey="value" content={<CustomLabelVertical />} />
                    {dataBloco.ultimos12Meses.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === dataBloco.ultimos12Meses.length - 1 ? '#f97316' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Comparativos (Linha de Baixo) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Mês Atual vs Ano Anterior */}
          <Card className="col-span-1 flex flex-col shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Mês Atual vs Ano Anterior</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataMesAtual} margin={{ top: 30, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={formatCompactBRL} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60} isAnimationActive={false}>
                      <LabelList dataKey="value" content={<CustomLabelTop />} />
                      {dataMesAtual.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Mês Anterior vs Ano Anterior */}
          <Card className="col-span-1 flex flex-col shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Mês Anterior vs Ano Anterior</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataMesAnterior} margin={{ top: 30, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={formatCompactBRL} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60} isAnimationActive={false}>
                      <LabelList dataKey="value" content={<CustomLabelTop />} />
                      {dataMesAnterior.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {data?.updated_at && (
            <p className="text-sm text-muted-foreground mt-1">
              Última Atualização em {new Date(data.updated_at).toLocaleDateString('pt-BR')} às {new Date(data.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <Button 
          onClick={(e) => fetchData(true, e.shiftKey || e.ctrlKey)} 
          disabled={refreshing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
        </Button>
      </div>

      <ChartRow title="RECEITAS TOTAIS RECEBIDAS (Regime de Caixa)" dataBloco={blocoCaixa} />
      <ChartRow title="FATURAMENTO TOTAL (Regime de Competência)" dataBloco={blocoCompetencia} />

      {/* BLOCO 3 - INDICADORES FINANCEIROS */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">INDICADORES FINANCEIROS</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-6 flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Receita Recorrente Mensal</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-slate-800">{formatBRL(blocoHonorarios.faturamentoMesAnterior || 0)}</span>
                <span className={`text-sm font-bold flex items-center ${blocoHonorarios.variacaoRRM >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {blocoHonorarios.variacaoRRM >= 0 ? '↑' : '↓'} {Math.abs(blocoHonorarios.variacaoRRM).toFixed(1)}%
                </span>
              </div>
              <span className="text-xs text-slate-400 mt-2 font-medium">Ano anterior: {formatBRL(blocoHonorarios.faturamentoMesAnteriorAnoAnterior || 0)} ({blocoHonorarios.mesAnteriorNomeAnoAnterior})</span>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-6 flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Ticket Médio ({blocoHonorarios.mesAnteriorNome})</span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-slate-800">{formatBRL(blocoHonorarios.ticketMedioMesAnterior || 0)}</span>
                <span className={`text-sm font-bold flex items-center ${blocoHonorarios.variacaoTicket >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {blocoHonorarios.variacaoTicket >= 0 ? '↑' : '↓'} {Math.abs(blocoHonorarios.variacaoTicket).toFixed(1)}%
                </span>
              </div>
              <span className="text-xs text-slate-400 mt-2 font-medium">Ano anterior: {formatBRL(blocoHonorarios.ticketMedioMesAnteriorAnoAnterior || 0)} ({blocoHonorarios.mesAnteriorNomeAnoAnterior})</span>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-orange-500">
            <CardContent className="p-6 flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Faturamento Total ({blocoHonorarios.anoAnterior})</span>
              <span className="text-3xl font-black text-slate-800">{formatBRL(blocoHonorarios.faturamentoTotalAnoAnterior || 0)}</span>
              <div className="flex items-baseline gap-2 mt-1 border-t pt-2">
                <span className="text-sm font-bold text-slate-600">Média: {formatBRL(blocoHonorarios.mediaMensalAnoAnterior || 0)}/mês</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xs font-medium text-slate-500">Ticket aprox.: {formatBRL(blocoHonorarios.ticketMedioAnoAnterior || 0)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-purple-500">
            <CardContent className="p-6 flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Faturamento Total (Até {blocoHonorarios.mesAnteriorNome})</span>
              <span className="text-3xl font-black text-slate-800">{formatBRL(blocoHonorarios.faturamentoAcumuladoAnoCorrente || 0)}</span>
              <span className="text-xs text-slate-400 mt-2 font-medium">Acumulado do ano corrente</span>
            </CardContent>
          </Card>

        </div>
      </div>

    </div>
  );
}
