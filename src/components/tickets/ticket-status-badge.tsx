import { Badge } from '@/components/ui/badge';

interface TicketStatusBadgeProps {
  status: string;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    open: { label: 'Aberto', variant: 'default' },
    in_progress: { label: 'Em Andamento', variant: 'secondary' },
    resolved: { label: 'Resolvido', variant: 'outline' }, // Outline geralmente é cinza, mas quero verde. Vou customizar style
    closed: { label: 'Fechado', variant: 'outline' },
  };

  const config = statusConfig[status] || { label: status, variant: 'default' };

  let className = '';
  if (status === 'open') className = 'bg-blue-500 hover:bg-blue-600';
  if (status === 'in_progress') className = 'bg-yellow-500 hover:bg-yellow-600 text-black';
  if (status === 'resolved') className = 'bg-green-500 hover:bg-green-600 text-white border-none';
  if (status === 'closed') className = 'bg-gray-500 hover:bg-gray-600 text-white';

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
