import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { redirect } from 'next/navigation';
import { Building2, FileText } from 'lucide-react';

export default async function ClientDashboard() {
  const session = await getSession();
  if (!session) redirect('/login');

  if (session.role === 'admin' || session.role === 'operator') {
    redirect('/admin/dashboard');
  }

  // Get User Companies with Admission Counts
  const companies = await db.prepare(`
    SELECT 
      cc.id, 
      cc.nome, 
      cc.cnpj,
      (SELECT COUNT(*) FROM admission_requests WHERE company_id = cc.id) as admission_count
    FROM client_companies cc
    JOIN user_companies uc ON uc.company_id = cc.id
    WHERE uc.user_id = ?
    ORDER BY cc.nome ASC
  `).all(session.user_id) as Array<{
    id: string;
    nome: string;
    cnpj: string;
    admission_count: number;
  }>;

  if (companies.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
            <h2 className="text-xl font-semibold text-gray-700">Bem-vindo ao Vision</h2>
            <p className="text-gray-500">Você ainda não está vinculado a nenhuma empresa.</p>
            <p className="text-sm text-gray-400">Entre em contato com o suporte para liberar seu acesso.</p>
        </div>
      );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Painel Geral</h1>
        <p className="text-gray-500 mt-2">Visão geral das suas empresas e admissões.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card key={company.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {company.nome}
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                 <div className="text-2xl font-bold">{company.admission_count}</div>
                 <FileText className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {company.cnpj}
              </p>
              <div className="mt-4 pt-4 border-t">
                  <Link href="/app/admissions" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                      Ver admissões &rarr;
                  </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
