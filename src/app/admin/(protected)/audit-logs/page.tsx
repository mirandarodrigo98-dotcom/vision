import db from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { SearchInput } from '@/components/ui/search-input';
import { ColumnHeader } from '@/components/ui/column-header';

interface AuditLogsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'timestamp';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';

  // Whitelist allowed sort columns
  const allowedSorts = ['timestamp', 'actor_email', 'action', 'entity_type', 'success', 'ip'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'timestamp';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = 'SELECT * FROM audit_logs';
  const params: any[] = [];

  if (q) {
    query += ' WHERE (actor_email LIKE ? OR action LIKE ? OR entity_type LIKE ? OR details LIKE ?)';
    const likeQ = `%${q}%`;
    params.push(likeQ, likeQ, likeQ, likeQ);
  }

  query += ` ORDER BY ${safeSort} ${safeOrder} LIMIT 200`;

  const logs = await db.prepare(query).all(...params) as any[];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Logs de Auditoria</h2>
        <Button asChild variant="outline">
            <a href="/api/admin/audit-logs/export" download>
                Exportar CSV
            </a>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <SearchInput placeholder="Buscar por ator, ação, entidade ou detalhes..." />
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <ColumnHeader column="timestamp" title="Data/Hora" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="actor_email" title="Ator" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="action" title="Ação" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="entity_type" title="Entidade" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="success" title="Status" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="ip" title="IP" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs">{format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                <TableCell className="text-xs">
                    <div>{log.actor_email}</div>
                    <div className="text-gray-500">{log.role}</div>
                </TableCell>
                <TableCell className="text-xs font-semibold">{log.action}</TableCell>
                <TableCell className="text-xs">
                    {log.entity_type}
                    {log.entity_id && <div className="text-gray-400 text-[10px]">{log.entity_id.substring(0,8)}...</div>}
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded ${log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {log.success ? 'Sucesso' : 'Erro'}
                  </span>
                </TableCell>
                <TableCell className="text-xs">{log.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
