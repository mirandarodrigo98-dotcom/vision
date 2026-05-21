'use client';

import { useEffect, useMemo, useState } from 'react';
import type { IRDeclaration } from '@/app/actions/imposto-renda';
import { IRDashboard } from '@/components/imposto-renda/ir-dashboard';
import { IRGrid } from '@/components/imposto-renda/ir-grid';

interface IROverviewProps {
  declarations: IRDeclaration[];
}

function buildStatusStats(declarations: IRDeclaration[]) {
  const statusCounts = declarations.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value
  }));
}

function buildReceiptStats(declarations: IRDeclaration[]) {
  const activeDeclarations = declarations.filter((declaration) => declaration.status !== 'Cancelada');

  const normalized = activeDeclarations.map((declaration) => {
    const serviceValue = Number(declaration.service_value || 0);
    const receivedRaw = Number(declaration.receipt_value || 0);
    const receivedValue = serviceValue > 0 ? Math.min(receivedRaw, serviceValue) : receivedRaw;
    const pendingValue = serviceValue > 0 ? Math.max(serviceValue - receivedValue, 0) : 0;
    const isFullyReceived = serviceValue > 0 ? pendingValue === 0 : Boolean(declaration.is_received || receivedValue > 0);

    return {
      isFullyReceived,
      receivedValue,
      pendingValue
    };
  });

  const receivedCount = normalized.filter((declaration) => declaration.isFullyReceived).length;
  const notReceivedCount = normalized.length - receivedCount;
  const receivedValue = normalized.reduce((sum, declaration) => sum + declaration.receivedValue, 0);
  const notReceivedValue = normalized.reduce((sum, declaration) => sum + declaration.pendingValue, 0);

  return [
    { name: 'Recebidas', value: receivedCount, moneyValue: Number(receivedValue) },
    { name: 'Não Recebidas', value: notReceivedCount, moneyValue: Number(notReceivedValue) }
  ];
}

export function IROverview({ declarations }: IROverviewProps) {
  const [visibleDeclarations, setVisibleDeclarations] = useState<IRDeclaration[]>(declarations);

  useEffect(() => {
    setVisibleDeclarations(declarations);
  }, [declarations]);

  const stats = useMemo(() => buildStatusStats(visibleDeclarations), [visibleDeclarations]);
  const receiptsStats = useMemo(() => buildReceiptStats(visibleDeclarations), [visibleDeclarations]);

  return (
    <div className="space-y-4">
      <IRDashboard stats={stats} receiptsStats={receiptsStats} />
      <IRGrid declarations={declarations} onVisibleDeclarationsChange={setVisibleDeclarations} />
    </div>
  );
}
