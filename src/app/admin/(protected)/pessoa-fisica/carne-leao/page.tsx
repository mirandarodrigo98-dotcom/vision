import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, ChevronRight } from 'lucide-react';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Selecionar Cliente - Carnê Leão | VISION',
};

export default async function SelectClientCarneLeao() {
  const session = await getSession();
  
  let query = `
    SELECT u.id, u.name, u.email, u.cell_phone 
    FROM users u 
    WHERE u.role = 'client_user' AND u.carne_leao_access = true
  `;
  
  const params: any[] = [];

  if (session && session.role === 'operator') {
    query += ` AND EXISTS (
      SELECT 1 
      FROM user_companies sub_uc
      JOIN user_restricted_companies sub_urc ON sub_urc.company_id = sub_uc.company_id
      WHERE sub_uc.user_id = u.id AND sub_urc.user_id = $1
    )`;
    params.push(session.user_id);
  }

  query += ` ORDER BY u.name ASC`;
  
  const users = (await db.query(query, params)).rows;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Carnê Leão - Selecionar Cliente</h2>
      </div>
      <p className="text-muted-foreground mt-2 mb-6">
        Selecione o usuário do cliente para visualizar e gerenciar seus lançamentos no Carnê Leão. 
        Apenas usuários com a permissão "Carnê Leão" habilitada são exibidos.
      </p>

      {users.length === 0 ? (
        <Card className="max-w-xl">
          <CardContent className="pt-6 flex flex-col items-center text-center text-muted-foreground space-y-2">
            <User className="h-12 w-12 opacity-20 mb-2" />
            <p>Nenhum usuário com acesso ao Carnê Leão encontrado.</p>
            <p className="text-sm">Vá em Cadastro {'>'} Usuários e edite as permissões de um cliente para habilitar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
          {users.map((u: any) => (
            <Card key={u.id} className="hover:border-[#1b5fcc] transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-[#1b5fcc]" />
                  {u.name}
                </CardTitle>
                <CardDescription className="truncate">
                  {u.email}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={`/admin/pessoa-fisica/carne-leao/${u.id}`}>
                  <Button variant="outline" className="w-full justify-between hover:bg-blue-50 hover:text-[#1b5fcc] hover:border-blue-200">
                    Acessar Lançamentos
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}