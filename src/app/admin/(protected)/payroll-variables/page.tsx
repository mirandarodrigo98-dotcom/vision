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
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Protocolo Zen</TableHead>
              <TableHead className="text-center">Empresa</TableHead>
              <TableHead className="text-center">Mês Ref.</TableHead>
              <TableHead className="text-center">Data de Envio</TableHead>
              <TableHead className="text-center">Usuário</TableHead>
              <TableHead className="text-center">Status</TableHead>
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
                  <TableCell className="text-center font-mono text-sm">
                    {formatZenProtocol(item.zen_protocol)}
                  </TableCell>
                  <TableCell className="text-center font-medium">{item.company_name}</TableCell>
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
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
