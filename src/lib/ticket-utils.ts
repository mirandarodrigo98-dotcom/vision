export function translateStatus(status: string): string {
  const map: Record<string, string> = {
    'open': 'Aberto',
    'in_progress': 'Em Andamento',
    'resolved': 'Resolvido',
    'closed': 'Fechado',
    'returned': 'Devolvido',
    'cancelled': 'Cancelado'
  };
  return map[status] || status;
}

export function translatePriority(priority: string): string {
  const map: Record<string, string> = {
    'low': 'Baixa',
    'medium': 'Média',
    'high': 'Alta',
    'critical': 'Crítica'
  };
  return map[priority] || priority;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    'open': 'bg-blue-500 hover:bg-blue-600',
    'in_progress': 'bg-yellow-500 hover:bg-yellow-600 text-black',
    'resolved': 'bg-green-500 hover:bg-green-600',
    'closed': 'bg-gray-500 hover:bg-gray-600',
    'returned': 'bg-orange-500 hover:bg-orange-600',
    'cancelled': 'bg-red-500 hover:bg-red-600'
  };
  return map[status] || 'bg-gray-500';
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    'low': 'bg-slate-500',
    'medium': 'bg-blue-500',
    'high': 'bg-orange-500',
    'critical': 'bg-red-600'
  };
  return map[priority] || 'bg-gray-500';
}
