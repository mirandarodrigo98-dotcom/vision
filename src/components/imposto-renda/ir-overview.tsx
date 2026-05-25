'use client';

import { useCallback, useState } from 'react';

import {
  getIRDeclarations,
  getIRReceiptStats,
  getIRStats,
  IRDeclaration,
} from '@/app/actions/imposto-renda';
import { IRDashboard } from '@/components/imposto-renda/ir-dashboard';
import { IRGrid } from '@/components/imposto-renda/ir-grid';

type IRStatItem = { name: string; value: number };
type IRReceiptStatItem = { name: string; value: number; moneyValue?: number };

interface IROverviewProps {
  declarations: IRDeclaration[];
  stats: IRStatItem[];
  receiptsStats: IRReceiptStatItem[];
}

export function IROverview({ declarations, stats, receiptsStats }: IROverviewProps) {
  const [currentDeclarations, setCurrentDeclarations] = useState(declarations);
  const [currentStats, setCurrentStats] = useState(stats);
  const [currentReceiptsStats, setCurrentReceiptsStats] = useState(receiptsStats);

  const refreshAll = useCallback(async () => {
    const refreshKey = String(Date.now());
    const [latestDeclarations, latestStats, latestReceiptsStats] = await Promise.all([
      getIRDeclarations(refreshKey),
      getIRStats(),
      getIRReceiptStats(),
    ]);

    setCurrentDeclarations(latestDeclarations);
    setCurrentStats(latestStats);
    setCurrentReceiptsStats(latestReceiptsStats);

    return latestDeclarations;
  }, []);

  return (
    <div className="space-y-4">
      <IRDashboard stats={currentStats} receiptsStats={currentReceiptsStats} />
      <IRGrid declarations={currentDeclarations} onRefreshData={refreshAll} />
    </div>
  );
}
