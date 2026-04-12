'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell, ComposedChart, Line } from 'recharts';
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
      setData({ ...res.data, updated_at: res.updated_at });
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

  const { blocoCaixa, blocoCompetencia, blocoCaptacao, blocoHonorarios } = data;

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

    const variacaoAtual = dataMesAtual[0].value > 0 ? ((dataMesAtual[1].value - dataMesAtual[0].value) / dataMesAtual[0].value) * 100 : (dataMesAtual[1].value > 0 ? 100 : 0);
    const variacaoAnterior = dataMesAnterior[0].value > 0 ? ((dataMesAnterior[1].value - dataMesAnterior[0].value) / dataMesAnterior[0].value) * 100 : (dataMesAnterior[1].value > 0 ? 100 : 0);

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
                <ComposedChart data={dataBloco.ultimos12Meses} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={formatCompactBRL} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80} isAnimationActive={false}>
                    <LabelList dataKey="value" content={<CustomLabelTop />} />
                    {dataBloco.ultimos12Meses.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === dataBloco.ultimos12Meses.length - 1 ? '#f97316' : '#94a3b8'} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Comparativos (Linha de Baixo) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Mês Atual vs Ano Anterior */}
          <Card className="col-span-1 flex flex-col shadow-sm relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Mês Atual vs Ano Anterior</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 relative">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ top: '-20px' }}>
                 <div className={`px-2 py-1 rounded-md bg-white/80 backdrop-blur-sm border shadow-sm flex items-center gap-1 text-sm font-bold ${variacaoAtual >= 0 ? 'text-emerald-500 border-emerald-100' : 'text-red-500 border-red-100'}`}>
                    {variacaoAtual >= 0 ? '↑' : '↓'} {Math.abs(variacaoAtual).toFixed(1)}%
                 </div>
              </div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dataMesAtual} margin={{ top: 30, right: 10, left: -10, bottom: 0 }}>
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
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Mês Anterior vs Ano Anterior */}
          <Card className="col-span-1 flex flex-col shadow-sm relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Mês Anterior vs Ano Anterior</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 relative">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ top: '-20px' }}>
                 <div className={`px-2 py-1 rounded-md bg-white/80 backdrop-blur-sm border shadow-sm flex items-center gap-1 text-sm font-bold ${variacaoAnterior >= 0 ? 'text-emerald-500 border-emerald-100' : 'text-red-500 border-red-100'}`}>
                    {variacaoAnterior >= 0 ? '↑' : '↓'} {Math.abs(variacaoAnterior).toFixed(1)}%
                 </div>
              </div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dataMesAnterior} margin={{ top: 30, right: 10, left: -10, bottom: 0 }}>
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
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} />
                  </ComposedChart>
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
          {data?.updated_at ? (
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              Última Atualização em {new Date(data.updated_at).toLocaleDateString('pt-BR')} às {new Date(data.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              Dados atualizados recentemente.
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
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Receita Recorrente Mensal ({blocoHonorarios.mesAnteriorNome})</span>
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
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-slate-800">{formatBRL(blocoHonorarios.faturamentoAcumuladoAnoCorrente || 0)}</span>
                <span className={`text-sm font-bold flex items-center ${blocoHonorarios.variacaoAcumulado >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {blocoHonorarios.variacaoAcumulado >= 0 ? '↑' : '↓'} {Math.abs(blocoHonorarios.variacaoAcumulado).toFixed(1)}%
                </span>
              </div>
              <span className="text-xs text-slate-400 mt-2 font-medium">Ano anterior: {formatBRL(blocoHonorarios.faturamentoAcumuladoAnoAnteriorMesmoPeriodo || 0)} (Até {blocoHonorarios.mesAnteriorNomeAnoAnterior})</span>
              
              <div className="flex items-baseline gap-2 mt-1 border-t pt-2">
                <span className="text-xs font-medium text-slate-500">Ticket médio: {formatBRL(blocoHonorarios.ticketMedioAcumuladoAnoCorrente || 0)}</span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xs font-medium text-slate-400">Ticket anterior: {formatBRL(blocoHonorarios.ticketMedioAcumuladoAnoAnterior || 0)}</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* BLOCO 4 - MOVIMENTAÇÃO DE CLIENTES */}
      {blocoCaptacao && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">MOVIMENTAÇÃO DE CLIENTES</h2>
          
          <Card className="w-full flex flex-col shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Últimos 12 Meses (Até {blocoHonorarios.mesAnteriorNome})</CardTitle>
              <div className="flex items-center gap-4 text-sm font-medium">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div>Entradas</div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500"></div>Saídas</div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={blocoCaptacao.ultimos12Meses} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} interval={0} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60}>
                      <LabelList dataKey="entradas" position="top" fill="#64748b" fontSize={11} fontWeight="bold" formatter={(val: number) => val > 0 ? val : ''} />
                    </Bar>
                    <Bar dataKey="saidas" name="Saídas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={60}>
                      <LabelList dataKey="saidas" position="top" fill="#64748b" fontSize={11} fontWeight="bold" formatter={(val: number) => val > 0 ? val : ''} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-end items-center gap-2 mt-4 pt-4 border-t">
                <span className="text-sm font-semibold text-slate-500">Resultado do Período:</span>
                <span className="text-2xl font-black text-slate-800">{blocoCaptacao.saldoPeriodo > 0 ? '+' : ''}{blocoCaptacao.saldoPeriodo}</span>
                <span className={`text-sm font-bold flex items-center ${blocoCaptacao.saldoPeriodo >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {blocoCaptacao.saldoPeriodo >= 0 ? '↑' : '↓'} {Math.abs(blocoCaptacao.percentualSaldo).toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="shadow-sm border-l-4 border-l-slate-400">
              <CardContent className="p-6 flex flex-col gap-1">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total ({blocoCaptacao.anoAnterior?.label})</span>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Entradas</span>
                    <div className="flex items-center gap-1">
                      <p className="text-2xl font-black text-emerald-500">{blocoCaptacao.anoAnterior?.entradas || 0}</p>
                      <span className={`text-xs font-bold ${(blocoCaptacao.anoAnterior?.variacaoEntradas || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {(blocoCaptacao.anoAnterior?.variacaoEntradas || 0) >= 0 ? '↑' : '↓'}{Math.abs(blocoCaptacao.anoAnterior?.variacaoEntradas || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Saídas</span>
                    <div className="flex items-center gap-1">
                      <p className="text-2xl font-black text-rose-500">{blocoCaptacao.anoAnterior?.saidas || 0}</p>
                      <span className={`text-xs font-bold ${(blocoCaptacao.anoAnterior?.variacaoSaidas || 0) <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {(blocoCaptacao.anoAnterior?.variacaoSaidas || 0) >= 0 ? '↑' : '↓'}{Math.abs(blocoCaptacao.anoAnterior?.variacaoSaidas || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-l-4 border-l-indigo-500">
              <CardContent className="p-6 flex flex-col gap-1">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total ({blocoCaptacao.anoCorrente?.label})</span>
                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Entradas</span>
                    <div className="flex items-center gap-1">
                      <p className="text-2xl font-black text-emerald-500">{blocoCaptacao.anoCorrente?.entradas || 0}</p>
                      <span className={`text-xs font-bold ${(blocoCaptacao.anoCorrente?.variacaoEntradas || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {(blocoCaptacao.anoCorrente?.variacaoEntradas || 0) >= 0 ? '↑' : '↓'}{Math.abs(blocoCaptacao.anoCorrente?.variacaoEntradas || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Saídas</span>
                    <div className="flex items-center gap-1">
                      <p className="text-2xl font-black text-rose-500">{blocoCaptacao.anoCorrente?.saidas || 0}</p>
                      <span className={`text-xs font-bold ${(blocoCaptacao.anoCorrente?.variacaoSaidas || 0) <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {(blocoCaptacao.anoCorrente?.variacaoSaidas || 0) >= 0 ? '↑' : '↓'}{Math.abs(blocoCaptacao.anoCorrente?.variacaoSaidas || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {blocoCaptacao.trimestre && (
              <Card className="shadow-sm border-l-4 border-l-emerald-500">
                <CardContent className="p-6 flex flex-col gap-1">
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{blocoCaptacao.trimestre?.label}</span>
                  <p className="text-[10px] text-slate-400 mt-0.5 mb-2 leading-tight">vs mesmo período do ano anterior</p>
                  <div className="flex items-center gap-4 mt-1">
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-semibold">Entradas</span>
                      <div className="flex items-center gap-1">
                        <p className="text-2xl font-black text-emerald-500">{blocoCaptacao.trimestre?.entradas || 0}</p>
                        <span className={`text-xs font-bold ${(blocoCaptacao.trimestre?.variacaoEntradas || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {(blocoCaptacao.trimestre?.variacaoEntradas || 0) >= 0 ? '↑' : '↓'}{Math.abs(blocoCaptacao.trimestre?.variacaoEntradas || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 uppercase font-semibold">Saídas</span>
                      <div className="flex items-center gap-1">
                        <p className="text-2xl font-black text-rose-500">{blocoCaptacao.trimestre?.saidas || 0}</p>
                        <span className={`text-xs font-bold ${(blocoCaptacao.trimestre?.variacaoSaidas || 0) <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {(blocoCaptacao.trimestre?.variacaoSaidas || 0) >= 0 ? '↑' : '↓'}{Math.abs(blocoCaptacao.trimestre?.variacaoSaidas || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
