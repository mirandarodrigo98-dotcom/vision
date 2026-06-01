export type SolicitationStatus = 'SUBMITTED' | 'RECTIFIED' | 'COMPLETED' | 'CANCELLED';

export function getSolicitationStatusLabel(status: string): string {
  switch (status) {
    case 'SUBMITTED':
      return 'Pendente';
    case 'RECTIFIED':
      return 'Retificada';
    case 'COMPLETED':
      return 'Concluida';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status || '-';
  }
}

export function getSolicitationNotificationTitle(
  requestTypeName: string,
  statusLabel: string
) {
  return `Solicitacao - ${requestTypeName} (${statusLabel})`;
}
