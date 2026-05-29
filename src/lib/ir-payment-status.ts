export type IRPaymentStatus = 'Não' | 'Parcial' | 'Sim';

export function getIRPaymentStatus(serviceValue?: number | null, receivedValue?: number | null, fallbackReceived?: boolean | null): IRPaymentStatus {
  const normalizedServiceValue = Number(serviceValue || 0);
  const normalizedReceivedValue = Number(receivedValue || 0);

  if (normalizedServiceValue > 0) {
    if (normalizedReceivedValue <= 0) return 'Não';
    if (normalizedReceivedValue < normalizedServiceValue) return 'Parcial';
    return 'Sim';
  }

  if (fallbackReceived) {
    return 'Sim';
  }

  return normalizedReceivedValue > 0 ? 'Parcial' : 'Não';
}

export function getIRPaymentStatusOrder(status: IRPaymentStatus): number {
  if (status === 'Não') return 0;
  if (status === 'Parcial') return 1;
  return 2;
}
