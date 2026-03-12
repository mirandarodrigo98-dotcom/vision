'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Enuves Integration Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4 text-center p-6">
      <div className="bg-red-50 p-4 rounded-full">
        <AlertCircle className="h-10 w-10 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Algo deu errado!</h2>
      <p className="text-muted-foreground max-w-md">
        Não foi possível carregar a integração com o Enuves. Tente recarregar a página.
      </p>
      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs font-mono max-w-lg overflow-auto">
          <p className="font-bold text-red-500">{error.message}</p>
          {error.digest && <p className="text-gray-500 mt-1">Digest: {error.digest}</p>}
        </div>
      )}
      <div className="flex gap-4 mt-6">
        <Button onClick={() => window.location.reload()} variant="outline">
          Recarregar Página
        </Button>
        <Button onClick={() => reset()}>
          Tentar Novamente
        </Button>
      </div>
    </div>
  );
}
