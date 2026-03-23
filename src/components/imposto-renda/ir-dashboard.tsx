'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
}

export function IRDashboard({ stats }: IRDashboardProps) {
  const total = stats.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="col-span-4 lg:col-span-1">
      <CardHeader>
        <CardTitle>Status das Declarações</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        {total === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Nenhuma declaração encontrada
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  const percent = ((value / total) * 100).toFixed(0);

                  return (
                    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12">
                      {`${percent}%`}
                    </text>
                  );
                }}
              >
                {stats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#ccc'} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
