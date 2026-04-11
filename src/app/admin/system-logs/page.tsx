import db from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function SystemLogsPage() {
  let logs: any[] = [];
  let errorMsg = null;

  try {
    // Tenta buscar os logs, se a tabela existir
    logs = (await db.query('SELECT * FROM system_errors ORDER BY created_at DESC LIMIT 50', [])).rows;
  } catch (error: any) {
    // Se a tabela não existir ainda ou der erro, captura
    errorMsg = error.message;
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Logs de Erros do Sistema</h1>
        <p className="text-muted-foreground">
          Visualização dos últimos 50 erros registrados pela aplicação (útil para debug de integrações como o Digisac).
          <span className="block text-xs mt-1 text-yellow-600">* Horários exibidos no fuso horário de Brasília (America/Sao_Paulo).</span>
        </p>
      </div>

      {errorMsg ? (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600 font-medium">Aviso: A tabela de logs ainda não foi criada ou houve um erro.</p>
            <p className="text-sm text-red-500 mt-2">{errorMsg}</p>
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhum erro registrado no banco de dados até o momento.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50 pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg text-red-600 flex items-center gap-2">
                    {log.context}
                  </CardTitle>
                  <span className="text-xs font-mono bg-white px-2 py-1 rounded border">
                    {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'Data desconhecida'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[200px] w-full rounded-b-md bg-slate-950 p-4">
                  <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                    {log.details}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
