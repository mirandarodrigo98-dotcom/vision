import { Badge } from '@/components/ui/badge';
import { translateStatus, getStatusColor } from '@/lib/ticket-utils';

interface TicketStatusBadgeProps {
  status: string;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const label = translateStatus(status);
  const colorClass = getStatusColor(status);

  // Forçar variant 'outline' para remover cores padrões do shadcn que podem conflitar
  // e aplicar nossas classes de cor manualmente
  return (
    <Badge variant="outline" className={`${colorClass} border-0`}>
      {label}
    </Badge>
  );
}
