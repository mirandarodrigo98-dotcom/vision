import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusIcon, FileTextIcon } from 'lucide-react';
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

export default async function AdminPayrollVariablesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const isAdmin = session.role === 'admin' || session.role === 'operator';

  if (!isAdmin) {
    redirect('/app');
  }

  const variables = (await db.query(`
    SELECT pv.*, cc.nome as company_name, u.name as created_by_name
    FROM payroll_variables pv
    JOIN client_companies cc ON pv.company_id = cc.id
    LEFT JOIN users u ON pv.created_by_user_id = u.id
    ORDER BY pv.created_at DESC
  `)).rows;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Variáveis da Folha</h1>
          <p className="text-muted-foreground mt-1">
            Gestão e acompanhamento de variáveis enviadas pelos clientes para a folha de pagamento.
          </p>
        </div>
        <Link href="/admin/payroll-variables/new">
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
              <TableHead>Protocolo Zen</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Mês Ref.</TableHead>
              <TableHead>Data de Envio</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              variables.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">
                    {item.zen_protocol || '-'}
                  </TableCell>
                  <TableCell className="font-medium">{item.company_name}</TableCell>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}