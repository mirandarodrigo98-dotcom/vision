import { Badge } from '@/components/ui/badge';
import { translateStatus, getStatusColor } from '@/lib/ticket-utils';

interface TicketStatusBadgeProps {
  status: string;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const label = translateStatus(status);
  const colorClass = getStatusColor(status);

  // Removemos variant='outline' para usar o estilo padrão (sólido)
  // As classes de cor (colorClass) irão sobrescrever as cores padrão do componente
  return (
    <Badge className={`${colorClass} border-0 whitespace-nowrap`}>
      {label}
    </Badge>
  );
}
