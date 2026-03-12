import { Badge } from '@/components/ui/badge';

interface TicketPriorityBadgeProps {
  priority: string;
}

export function TicketPriorityBadge({ priority }: TicketPriorityBadgeProps) {
  const priorityConfig: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
  };

  let className = '';
  if (priority === 'low') className = 'bg-gray-400';
  if (priority === 'medium') className = 'bg-blue-500';
  if (priority === 'high') className = 'bg-orange-500';
  if (priority === 'critical') className = 'bg-red-600 font-bold';

  return (
    <Badge className={`${className} hover:${className}`}>
      {priorityConfig[priority] || priority}
    </Badge>
  );
}
