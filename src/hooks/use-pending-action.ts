'use client';

import { useCallback, useState } from 'react';

import { waitForBrowserPaint } from '@/lib/client-feedback';

type RunPendingActionOptions = {
  waitForPaint?: boolean;
};

export function usePendingAction<TAction extends string = string>() {
  const [pendingAction, setPendingAction] = useState<TAction | null>(null);

  const isPending = pendingAction !== null;

  const isActionPending = useCallback(
    (action: TAction) => pendingAction === action,
    [pendingAction]
  );

  const runAction = useCallback(
    async <TResult>(
      action: TAction,
      callback: () => Promise<TResult>,
      options: RunPendingActionOptions = {}
    ): Promise<TResult | undefined> => {
      if (pendingAction) {
        return undefined;
      }

      setPendingAction(action);

      try {
        if (options.waitForPaint !== false) {
          await waitForBrowserPaint();
        }

        return await callback();
      } finally {
        setPendingAction(null);
      }
    },
    [pendingAction]
  );

  return {
    pendingAction,
    isPending,
    isActionPending,
    runAction,
  };
}
