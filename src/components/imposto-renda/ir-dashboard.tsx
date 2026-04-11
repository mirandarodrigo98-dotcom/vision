'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS: Record<string, string> = {
  'Não Iniciado': '#64748b',
  'Iniciado': '#1e3a8a',
  'Pendente': '#dc2626',
  'Validada': '#eab308',
  'Transmitida': '#f97316',
  'Processada': '#16a34a',
  'Malha Fina': '#db2777',
  'Retificadora': '#7e22ce',
  'Reaberta': '#60a5fa',
  'Cancelada': '#0f172a'
};

interface IRDashboardProps {
  stats: { name: string; value: number }[];
  receiptsStats?: { name: string; value: number; moneyValue?: number }[];
}

export function IRDashboard({ stats, receiptsStats }: IRDashboardProps) {
  const total = stats.reduce((sum, item) => sum + item.value, 0);

  const donutReceipts = receiptsStats || [];
  const receiptsTotal = donutReceipts.reduce((sum, item) => sum + item.value, 0);

  const RADIAN = Math.PI / 180;
  const renderPercentLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="#fff" fontSize={13} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom tooltip to show ONLY the numeric value without text, placed in the top corner to prevent overlapping
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-md">
          {payload[0].value}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Status das Declarações */}
      <Card className="w-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle>Status das Declarações</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col h-[400px]">
          {total === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Nenhuma declaração encontrada
            </div>
          ) : (
            <>
              <div className="flex-1 relative min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      cornerRadius={6}
                      isAnimationActive
                      animationDuration={600}
                      label={renderPercentLabel}
                    >
                      {stats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#64748b'} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} position={{ x: 10, y: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Central value without negative margins, naturally centered over the donut hole */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-700 leading-none">{total}</span>
                    <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest mt-1">
                      Declarações
                    </span>
                  </div>
                </div>
              </div>
              {/* Custom Legend to prevent Recharts from displacing the chart vertically */}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center shrink-0">
                {stats.map(entry => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[entry.name] || '#64748b' }}></div>
                    <span className="text-slate-600 font-medium">{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 2. Recebidas vs Não Recebidas */}
      <Card className="w-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle>Recebidas vs Não Recebidas</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col h-[400px]">
          {(receiptsStats && receiptsStats.length > 0) ? (
            <>
              <div className="flex-1 relative min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutReceipts}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={110}
                      paddingAngle={3}
                      cornerRadius={6}
                      dataKey="value"
                      labelLine={false}
                      isAnimationActive
                      animationDuration={600}
                      label={renderPercentLabel}
                    >
                      {donutReceipts.map((entry, index) => (
                        <Cell key={`rc-${index}`} fill={entry.name === 'Recebidas' ? '#10b981' : '#ef4444'} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} position={{ x: 10, y: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Central value without negative margins */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-700 leading-none">
                      {(receiptsStats.find(r => r.name === 'Recebidas')?.value || 0)}/{(receiptsStats.find(r => r.name === 'Não Recebidas')?.value || 0) + (receiptsStats.find(r => r.name === 'Recebidas')?.value || 0)}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-widest mt-1">
                      Recebimentos
                    </span>
                  </div>
                </div>
              </div>
              {/* Removido o Custom Legend com valores - Movido para o 3º Card */}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Sem dados de recebimento
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Detalhamento Financeiro (Valores Recebidos e Não Recebidos) */}
      <Card className="w-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle>Detalhamento Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col h-[400px] justify-center">
          {(receiptsStats && receiptsStats.length > 0) ? (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                  <span className="text-base font-semibold text-emerald-900">Recebidas</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-800">
                    {receiptsStats.find(r => r.name === 'Recebidas')?.value || 0} decl.
                  </div>
                  <div className="text-lg font-bold text-emerald-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(receiptsStats.find(r => r.name === 'Recebidas')?.moneyValue) || 0)}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                  <span className="text-base font-semibold text-red-900">Não Recebidas</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-red-800">
                    {receiptsStats.find(r => r.name === 'Não Recebidas')?.value || 0} decl.
                  </div>
                  <div className="text-lg font-bold text-red-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(receiptsStats.find(r => r.name === 'Não Recebidas')?.moneyValue) || 0)}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200 rounded-lg mt-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-800"></div>
                  <span className="text-base font-bold text-slate-900">Total Esperado</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-700">
                    {receiptsTotal || 0} decl.
                  </div>
                  <div className="text-xl font-black text-slate-800">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      (Number(receiptsStats.find(r => r.name === 'Recebidas')?.moneyValue) || 0) + 
                      (Number(receiptsStats.find(r => r.name === 'Não Recebidas')?.moneyValue) || 0)
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Sem dados de recebimento
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
