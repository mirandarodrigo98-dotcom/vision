import { Badge } from '@/components/ui/badge';
import { translateStatus, getStatusColor } from '@/lib/ticket-utils';

interface TicketStatusBadgeProps {
  status: string;
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const label = translateStatus(status);
  const colorClass = getStatusColor(status);

  // Mapeamento de variantes do shadcn/ui baseado na cor/status
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';
  
  if (status === 'in_progress' || status === 'returned') variant = 'secondary';
  if (status === 'cancelled') variant = 'destructive';
  if (status === 'closed') variant = 'outline';
  // resolved e open usam default (mas com classes de cor customizadas)

  return (
    <Badge variant={variant} className={`${colorClass} border-none`}>
      {label}
    </Badge>
  );
}
