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

function formatMonthReference(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return '-';

  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    return `${match[2]}/${match[1]}`;
  }

  return raw;
}

function formatSentAt(value?: string | Date | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return format(date, 'dd/MM/yyyy HH:mm:ss');
}

function formatZenProtocol(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return '-';

  const idMatch = raw.match(/[a-f0-9]{24}/i);
  if (idMatch) {
    return idMatch[0];
  }

  const lastSegment = raw.split(/[/?#\s]+/).filter(Boolean).pop();
  return lastSegment || raw;
}

export default async function PayrollVariablesPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const isAdmin = session.role === 'admin' || session.role === 'operator';
  const companyId = session.active_company_id;

  if (!isAdmin && !companyId) {
    return <div className="p-8 text-center">Selecione uma empresa primeiro.</div>;
  }

  let query = `
    SELECT pv.*, cc.razao_social as company_name, u.name as created_by_name
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
        {!isAdmin && (
          <Link href="/app/payroll-variables/new">
            <Button className="gap-2">
              <PlusIcon className="h-4 w-4" />
              Lançar Variáveis
            </Button>
          </Link>
        )}
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && <TableHead className="text-center">Empresa</TableHead>}
              <TableHead className="text-center">Mês Ref.</TableHead>
              <TableHead className="text-center">Data de Envio</TableHead>
              <TableHead className="text-center">Usuário</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Protocolo Zen</TableHead>
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
                  {isAdmin && <TableCell className="text-center font-medium">{item.company_name}</TableCell>}
                  <TableCell className="text-center">{formatMonthReference(item.month_reference)}</TableCell>
                  <TableCell className="text-center">
                    {formatSentAt(item.created_at)}
                  </TableCell>
                  <TableCell className="text-center">{item.created_by_name}</TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      item.status === 'sent' ? 'bg-green-100 text-green-800' :
                      item.status === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status === 'sent' ? 'Enviado' : item.status === 'error' ? 'Erro' : 'Rascunho'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {formatZenProtocol(item.zen_protocol)}
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
