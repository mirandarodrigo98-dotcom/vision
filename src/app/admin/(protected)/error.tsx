
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin Layout/Page Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <h2 className="text-2xl font-bold mb-4">Erro na Área Administrativa</h2>
      <p className="text-red-600 mb-4">{error.message}</p>
      <pre className="bg-gray-100 p-4 rounded text-xs mb-4 max-w-2xl overflow-auto">
        {error.stack}
      </pre>
      <Button onClick={() => reset()}>Tentar novamente</Button>
    </div>
  );
}
