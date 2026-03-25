'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
      <text x={x} y={y} fill="#fff" fontSize={14} fontWeight="bold" textAnchor="middle" dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Status das Declarações</CardTitle>
        </CardHeader>
        <CardContent className="h-[360px] relative">
          {total === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Nenhuma declaração encontrada
            </div>
          ) : (
            <div className="h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={120}
                    paddingAngle={4}
                    dataKey="value"
                    labelLine={false}
                    cornerRadius={8}
                    isAnimationActive
                    animationDuration={600}
                    label={renderPercentLabel}
                  >
                    {stats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#64748b'} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value} decl. (${Math.round(((value as number) / (total || 1)) * 100)}%)`, name]}
                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold">{total}</span>
                  <span className="text-xs text-muted-foreground">Declarações</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recebidas vs Não Recebidas</CardTitle>
        </CardHeader>
        <CardContent className="h-[360px] pb-6">
          {(receiptsStats && receiptsStats.length > 0) ? (
            <div className="h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutReceipts}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
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
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => {
                      const money = props.payload.moneyValue;
                      const formattedMoney = money ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(money) : 'R$ 0,00';
                      return [`${value} decl. (${Math.round(((value as number) / (receiptsTotal || 1)) * 100)}%) - ${formattedMoney}`, name];
                    }}
                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold">
                    {(receiptsStats.find(r => r.name === 'Recebidas')?.value || 0)}/{(receiptsStats.find(r => r.name === 'Não Recebidas')?.value || 0) + (receiptsStats.find(r => r.name === 'Recebidas')?.value || 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">Recebimentos</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Sem dados de recebimento
            </div>
          )}
          {receiptsStats && (
            <div className="mt-1 flex gap-2 justify-center">
              <Badge variant="outline" className="border-emerald-600 text-emerald-700">Recebidas: {receiptsStats.find(r => r.name === 'Recebidas')?.value || 0}</Badge>
              <Badge variant="outline" className="border-red-600 text-red-700">Não Recebidas: {receiptsStats.find(r => r.name === 'Não Recebidas')?.value || 0}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
