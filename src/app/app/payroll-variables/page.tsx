import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default async function PayrollVariablesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const isAdmin = session.role === 'admin' || session.role === 'operator';
  const companyId = session.active_company_id;

  if (!isAdmin && !companyId) {
    return <div className="p-8 text-center">Selecione uma empresa primeiro.</div>;
  }

  let query = `
    SELECT pv.*, cc.nome as company_name, u.name as created_by_name
    FROM payroll_variables pv
    JOIN client_companies cc ON pv.company_id = cc.id
    LEFT JOIN users u ON pv.created_by_user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (!isAdmin) {
    query += ` AND pv.company_id = $1`;
    params.push(companyId);
  }

  query += ` ORDER BY pv.created_at DESC`;

  const variables = (await db.query(query, params)).rows;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Variáveis da Folha</h1>
          <p className="text-muted-foreground mt-1">
            Histórico de eventos e variáveis enviadas para a folha de pagamento.
          </p>
        </div>
        <Link href={isAdmin ? "/admin/payroll-variables/new" : "/app/payroll-variables/new"}>
          <Button className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Lançar Variáveis
          </Button>
        </Link>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && <TableHead>Empresa</TableHead>}
              <TableHead>Mês Ref.</TableHead>
              <TableHead>Data de Envio</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Protocolo Zen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              variables.map((item) => (
                <TableRow key={item.id}>
                  {isAdmin && <TableCell className="font-medium">{item.company_name}</TableCell>}
                  <TableCell>{item.month_reference}</TableCell>
                  <TableCell>
                    {item.created_at ? format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
                  </TableCell>
                  <TableCell>{item.created_by_name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'sent' ? 'bg-green-100 text-green-800' :
                      item.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status === 'sent' ? 'Enviado' : item.status === 'error' ? 'Erro' : 'Rascunho'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.zen_protocol || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
