'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, RadialBarChart, RadialBar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const COLORS: Record<string, string> = {
  'Não Iniciado': '#94a3b8',
  'Em andamento': '#3b82f6',
  'Pendente': '#eab308',
  'Em Validação': '#8b5cf6',
  'Cancelado': '#ef4444',
  'Transmitido': '#22c55e',
  'Processado': '#10b981',
  'Malha Fina': '#f97316'
};

interface IRDashboardProps {
  stats: { name: string; value: number }[];
  receiptsStats?: { name: string; value: number }[];
}

export function IRDashboard({ stats, receiptsStats }: IRDashboardProps) {
  const total = stats.reduce((sum, item) => sum + item.value, 0);

  const receivedTotal = receiptsStats?.reduce((sum, item) => sum + item.value, 0) || 0;
  const radialData = receiptsStats?.map(r => ({
    name: r.name,
    value: Math.round(((r.value || 0) / (receivedTotal || 1)) * 100),
    fill: r.name === 'Recebidas' ? '#10b981' : '#ef4444'
  })) || [];

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
                  >
                    {stats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#64748b'} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value}`, name]}
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
        <CardContent className="h-[360px]">
          {(receiptsStats && receiptsStats.length > 0) ? (
            <div className="h-full flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="30%" outerRadius="100%" data={radialData}>
                  <RadialBar minAngle={15} dataKey="value" cornerRadius={12} />
                  <Legend
                    iconSize={10}
                    layout="vertical"
                    verticalAlign="middle"
                    wrapperStyle={{ right: 0 }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                    contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Sem dados de recebimento
            </div>
          )}
          {receiptsStats && (
            <div className="mt-3 flex gap-2 justify-center">
              <Badge variant="outline" className="border-emerald-600 text-emerald-700">Recebidas: {receiptsStats.find(r => r.name === 'Recebidas')?.value || 0}</Badge>
              <Badge variant="outline" className="border-red-600 text-red-700">Não Recebidas: {receiptsStats.find(r => r.name === 'Não Recebidas')?.value || 0}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
