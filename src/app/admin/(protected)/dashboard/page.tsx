import db from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Building2, AlertCircle } from 'lucide-react';

export default async function AdminDashboard() {
  const stats = {
    totalAdmissions: await db.prepare('SELECT COUNT(*) FROM admission_requests').pluck().get() as number,
    pendingAdmissions: await db.prepare("SELECT COUNT(*) FROM admission_requests WHERE status = 'SUBMITTED'").pluck().get() as number,
    companies: await db.prepare('SELECT COUNT(*) FROM client_companies WHERE is_active = 1').pluck().get() as number,
    users: await db.prepare("SELECT COUNT(*) FROM users WHERE role = 'client_user' AND is_active = 1").pluck().get() as number,
  };

  const recentLogs = await db.prepare(`
    SELECT * FROM audit_logs 
    ORDER BY timestamp DESC 
    LIMIT 5
  `).all() as any[];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admissões Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingAdmissions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admissões</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAdmissions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.companies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      [{log.action}] {log.actor_email || 'Sistema'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.success ? 'Sucesso' : `Erro: ${log.error_message}`}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
              {recentLogs.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
