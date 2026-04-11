'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { getDashboardFinanceiroData } from '@/app/actions/integrations/omie-dashboard';
import { Loader2 } from 'lucide-react';

export function DashboardFinanceiro() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      const res = await getDashboardFinanceiroData();
      if (res.error) {
        setError(res.error);
      } else {
        setData(res.data);
      }
      setLoading(false);
    }
    fetchData();
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
      <div className="flex h-[400px] w-full items-center justify-center text-red-500 font-medium">
        {error || 'Erro ao carregar dados do dashboard.'}
      </div>
    );
  }

  const { bloco1, bloco2 } = data;

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatShortBRL = (val: number) => {
    if (val >= 1000000) return `R$ ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`;
    return `R$ ${val.toFixed(0)}`;
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

  const dataMesAtual = [
    { name: bloco1.mesAtual.labelAnoAnterior, value: bloco1.mesAtual.anoAnterior },
    { name: bloco1.mesAtual.labelAtual, value: bloco1.mesAtual.atual }
  ];

  const dataMesAnterior = [
    { name: bloco1.mesAnterior.labelAnoAnterior, value: bloco1.mesAnterior.anoAnterior },
    { name: bloco1.mesAnterior.labelAtual, value: bloco1.mesAnterior.atual }
  ];

  return (
    <div className="space-y-8">
      {/* BLOCO 1 - RECEITAS TOTAIS */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">RECEITAS TOTAIS</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* 1.1: Total 12 Meses */}
          <Card className="col-span-1 lg:col-span-1 flex flex-col shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Últimos 12 Meses</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bloco1.ultimos12Meses} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={formatShortBRL} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {bloco1.ultimos12Meses.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === bloco1.ultimos12Meses.length - 1 ? '#f97316' : '#cbd5e1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 1.2: Mês Atual vs Ano Anterior */}
          <Card className="col-span-1 lg:col-span-1 flex flex-col shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Mês Atual vs Ano Anterior</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataMesAtual} margin={{ top: 30, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={formatShortBRL} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    <Cell fill="#94a3b8" />
                    <Cell fill="#10b981" />
                    <LabelList dataKey="value" position="insideTop" offset={10} formatter={(val: number) => formatShortBRL(val)} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#ffffff' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 1.3: Mês Anterior vs Ano Anterior */}
          <Card className="col-span-1 lg:col-span-1 flex flex-col shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Mês Anterior vs Ano Anterior</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataMesAnterior} margin={{ top: 30, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={formatShortBRL} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    <Cell fill="#94a3b8" />
                    <Cell fill="#3b82f6" />
                    <LabelList dataKey="value" position="insideTop" offset={10} formatter={(val: number) => formatShortBRL(val)} style={{ fontSize: '11px', fontWeight: 'bold', fill: '#ffffff' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* BLOCO 2 - HONORÁRIOS CONTÁBEIS */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">HONORÁRIOS CONTÁBEIS</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-6 flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Ticket Médio (Mês Atual)</span>
              <span className="text-3xl font-black text-slate-800">{formatBRL(bloco2.ticketMedio)}</span>
              <span className="text-xs text-slate-400 mt-2 font-medium">Receita Recorrente / {bloco2.numClientesAtivos} clientes ativos</span>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-6 flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Receita Recorrente Mensal</span>
              <span className="text-3xl font-black text-slate-800">{formatBRL(bloco2.receitaRecorrente)}</span>
              <span className="text-xs text-slate-400 mt-2 font-medium">Soma de contratos fixos ativos</span>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-orange-500">
            <CardContent className="p-6 flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Ticket Médio Acumulado</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">{formatBRL(bloco2.ticketMedioAcumuladoAnoCorrente)}</span>
                <span className="text-xs text-slate-500 font-medium">Ano Atual</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1 border-t pt-2">
                <span className="text-lg font-bold text-slate-600">{formatBRL(bloco2.ticketMedioAcumuladoAnoAnterior)}</span>
                <span className="text-xs text-slate-400 font-medium">Ano Anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-purple-500">
            <CardContent className="p-6 flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Ticket / Faturam. (Mês Ant. vs Ano Ant.)</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-800">{formatBRL(bloco2.ticketMedioMesAnteriorAnoAnterior)}</span>
                <span className="text-xs text-slate-500 font-medium">Ticket M.A. (Ano Ant.)</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1 border-t pt-2">
                <span className="text-lg font-bold text-slate-600">{formatBRL(bloco2.faturamentoMesAnteriorAnoAnterior)}</span>
                <span className="text-xs text-slate-400 font-medium">Faturam. M.A. (Ano Ant.)</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

    </div>
  );
}
