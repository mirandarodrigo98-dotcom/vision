import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ViewProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');
  
  // Permission check
  const perms = await getUserPermissions();
  const canView = session.role === 'admin' || session.role === 'operator' || perms.includes('societario.processes.view') || perms.includes('societario.view');
  
  if (!canView) {
    return <div className="p-6">Sem permissão</div>;
  }

  let query = `
    SELECT sp.*, cc.razao_social as company_name, cc.cnpj as company_cnpj
    FROM societario_processes sp
    LEFT JOIN client_companies cc ON cc.id = sp.company_id
    WHERE sp.id = ?
  `;
  const queryParams: any[] = [id];

  if (session.role === 'operator') {
    query += ` AND (sp.company_id IS NULL OR sp.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?))`;
    queryParams.push(session.user_id);
  } else if (session.role === 'client_user') {
    query += ` AND sp.company_id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
    queryParams.push(session.user_id);
  }

  const process = await db.prepare(query).get(...queryParams) as any;
  if (!process) notFound();

  const displayRazao = process.razao_social || process.company_name || '-';
  const displayCnpj = process.company_cnpj || process.cnpj || '-';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Visualizar Processo</h1>
        <Link href="/admin/societario?tab=processos">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{displayRazao}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">CNPJ</div>
              <div className="font-medium">{displayCnpj}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tipo</div>
              <div className="font-medium">{process.type}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="font-medium">{process.status}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Criado em</div>
              <div className="font-medium">{process.created_at}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
