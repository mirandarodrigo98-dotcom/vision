import { Badge } from '@/components/ui/badge';
import { translatePriority, getPriorityColor } from '@/lib/ticket-utils';

interface TicketPriorityBadgeProps {
  priority: string;
}

export function TicketPriorityBadge({ priority }: TicketPriorityBadgeProps) {
  const label = translatePriority(priority);
  const colorClass = getPriorityColor(priority);

  return (
    <Badge className={`${colorClass} border-0 whitespace-nowrap`}>
      {label}
    </Badge>
  );
}
