'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { testQuestorConnectivity } from '@/app/actions/integrations/questor-syn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type ConnectivityResult = {
  success: boolean;
  details?: {
    internal?: { success: boolean; url?: string; message?: string };
    external?: { success: boolean; url?: string; message?: string };
    resolved?: string;
  };
};

interface QuestorConnectionStatusProps {
  autoCheck?: boolean;
  compact?: boolean;
  className?: string;
}

export function QuestorConnectionStatus({
  autoCheck = true,
  compact = false,
  className = '',
}: QuestorConnectionStatusProps) {
  const [checkingConnectivity, setCheckingConnectivity] = useState(false);
  const [connectivityResult, setConnectivityResult] = useState<ConnectivityResult | null>(null);
  const [lastConnectivityCheckAt, setLastConnectivityCheckAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!autoCheck) return;
    void handleCheckConnectivity();
  }, [autoCheck]);

  const handleCheckConnectivity = async () => {
    setCheckingConnectivity(true);
    try {
      const result = await testQuestorConnectivity();
      if ('error' in result && result.error) {
        toast.error(result.error);
        setConnectivityResult(null);
        return;
      }

      setConnectivityResult({
        success: Boolean(result.success),
        details: result.details,
      });
      setLastConnectivityCheckAt(new Date());
    } catch (error) {
      console.error(error);
      toast.error('Erro ao testar conexão do Questor SYN.');
      setConnectivityResult(null);
    } finally {
      setCheckingConnectivity(false);
    }
  };

  const renderStatusBadge = (success?: boolean, message?: string) => {
    if (success) {
      return <Badge className="bg-green-600 text-white hover:bg-green-600">Online</Badge>;
    }

    if (message) {
      return <Badge variant="destructive">{message}</Badge>;
    }

    return <Badge variant="secondary">Nao testado</Badge>;
  };

  if (compact) {
    return (
      <div className={`rounded-lg border bg-muted/20 p-3 ${className}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Questor SYN</span>
            <span className="text-xs text-muted-foreground">Interna</span>
            {renderStatusBadge(connectivityResult?.details?.internal?.success, connectivityResult?.details?.internal?.message)}
            <span className="text-xs text-muted-foreground">Externa</span>
            {renderStatusBadge(connectivityResult?.details?.external?.success, connectivityResult?.details?.external?.message)}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleCheckConnectivity} disabled={checkingConnectivity}>
            {checkingConnectivity ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Verificar
              </>
            )}
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span title={connectivityResult?.details?.resolved || 'Ainda nao resolvida'}>
            Em uso: {connectivityResult?.details?.resolved || 'Ainda nao resolvida'}
          </span>
          {lastConnectivityCheckAt ? <span>{format(lastConnectivityCheckAt, 'dd/MM/yyyy HH:mm:ss')}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border bg-muted/20 p-3 space-y-3 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Status da conexao Questor SYN</p>
          <p className="text-xs text-muted-foreground">
            Verifica se as URLs configuradas estao respondendo antes de executar a rotina.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleCheckConnectivity} disabled={checkingConnectivity}>
          {checkingConnectivity ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Verificar
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span>URL Interna</span>
          {renderStatusBadge(connectivityResult?.details?.internal?.success, connectivityResult?.details?.internal?.message)}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>URL Externa</span>
          {renderStatusBadge(connectivityResult?.details?.external?.success, connectivityResult?.details?.external?.message)}
        </div>
        <div className="flex items-start justify-between gap-3">
          <span>URL em uso</span>
          <span className="max-w-[260px] truncate text-right text-muted-foreground" title={connectivityResult?.details?.resolved || 'Ainda nao resolvida'}>
            {connectivityResult?.details?.resolved || 'Ainda nao resolvida'}
          </span>
        </div>
      </div>

      {lastConnectivityCheckAt ? (
        <p className="text-xs text-muted-foreground">
          Ultima verificacao: {format(lastConnectivityCheckAt, 'dd/MM/yyyy HH:mm:ss')}
        </p>
      ) : null}
    </div>
  );
}
