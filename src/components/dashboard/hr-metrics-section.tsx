'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DashboardMetrics } from '@/app/actions/dashboard';

const COLORS = {
  admissions: '#22c55e', // Green
  dismissals: '#ef4444', // Red
  vacations: '#3b82f6', // Blue
  transfers: '#f59e0b', // Amber
};

const LABELS = {
  admissions: 'Admissões',
  dismissals: 'Demissões',
  vacations: 'Férias',
  transfers: 'Transferências',
};

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  if (percent < 0.05) return null; // Don't show label for small slices (< 5%)

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      className="text-xs font-bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const renderLegend = (props: any) => {
  const { payload } = props;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-1.5 mt-1 w-full px-0.5">
      {payload.map((entry: any, index: number) => (
        <div key={`item-${index}`} className="flex items-center gap-0.5">
          <div 
            className="w-1.5 h-1.5 rounded-full shrink-0" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[9px] sm:text-[10px] text-gray-600 whitespace-nowrap leading-none font-medium tracking-tight">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

interface MetricPieProps {
  data: {
    admissions: number;
    dismissals: number;
    vacations: number;
    transfers: number;
  };
  title: string;
}

function MetricPie({ data, title }: MetricPieProps) {
  const chartData = [
    { name: LABELS.admissions, value: data.admissions, color: COLORS.admissions },
    { name: LABELS.dismissals, value: data.dismissals, color: COLORS.dismissals },
    { name: LABELS.vacations, value: data.vacations, color: COLORS.vacations },
    { name: LABELS.transfers, value: data.transfers, color: COLORS.transfers },
  ].filter(item => item.value > 0); // Only show segments with data

  if (chartData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center h-[300px]">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-400 text-sm">Sem dados registrados</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-[300px] flex flex-col">
      <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">{title}</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [value, 'Quantidade']}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend content={renderLegend} verticalAlign="bottom" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function HRMetricsSection({ metrics }: { metrics: DashboardMetrics | null }) {
  if (!metrics) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">
        Departamento Pessoal
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricPie 
          data={metrics.lastMonth} 
          title="Mês Anterior" 
        />
        <MetricPie 
          data={metrics.currentMonth} 
          title="Mês Atual" 
        />
        <MetricPie 
          data={metrics.last12Months} 
          title="Últimos 12 Meses" 
        />
      </div>
    </div>
  );
}
