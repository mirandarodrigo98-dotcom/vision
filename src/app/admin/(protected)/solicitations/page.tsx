import db from '@/lib/db';
import { format } from 'date-fns';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserPermissions } from '@/app/actions/permissions';
import { getSolicitationStatusLabel } from '@/lib/solicitations';
import { ensureSolicitationsTables } from '@/lib/solicitations-db';
import { SolicitationActions } from '@/components/solicitations/solicitation-actions';
import { ColumnHeader } from '@/components/ui/column-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSolicitationTypes } from '@/app/actions/solicitation-types';

export const dynamic = 'force-dynamic';

interface AdminSolicitationsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminSolicitationsPage({ searchParams }: AdminSolicitationsPageProps) {
  const session = await getSession();
  if (!session) redirect('/login');

  let hasViewPermission = false;
  const isAdmin = session.role === 'admin' || session.role === 'operator';

  if (isAdmin) {
    hasViewPermission = true;
  } else {
    const permissions = await getUserPermissions();
    hasViewPermission = permissions.includes('solicitations.view');
  }

  if (!hasViewPermission) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Voce nao tem permissao para visualizar solicitacoes.</p>
      </div>
    );
  }

  await ensureSolicitationsTables();

  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  const company = typeof resolvedSearchParams.company === 'string' ? resolvedSearchParams.company : '';
  const subject = typeof resolvedSearchParams.subject === 'string' ? resolvedSearchParams.subject : '';
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : '';
  const requestType = typeof resolvedSearchParams.request_type === 'string' ? resolvedSearchParams.request_type : '';

  const allowedSorts = ['protocol_number', 'created_at', 'company_name', 'request_type_name', 'subject', 'status'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = `
    SELECT
      s.*,
      COALESCE(cc.razao_social, cc.nome) AS company_name,
      st.name AS request_type_name,
      d.name AS department_name
    FROM solicitations s
    JOIN client_companies cc ON cc.id = s.company_id
    JOIN solicitation_types st ON st.id = s.request_type_id
    JOIN departments d ON d.id = s.department_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (session.role === 'operator') {
    query += ` AND s.department_id = $${params.length + 1}`;
    params.push(session.department_id);

    query += ` AND s.company_id NOT IN (
      SELECT company_id FROM user_restricted_companies WHERE user_id = $${params.length + 1}
    )`;
    params.push(session.user_id);
  }

  if (company && company.length >= 3) {
    query += ` AND (cc.razao_social ILIKE $${params.length + 1} OR cc.nome ILIKE $${params.length + 2})`;
    params.push(`%${company}%`, `%${company}%`);
  }

  if (subject) {
    query += ` AND s.subject ILIKE $${params.length + 1}`;
    params.push(`%${subject}%`);
  }

  if (status && status !== 'all') {
    query += ` AND s.status = $${params.length + 1}`;
    params.push(status);
  }

  if (requestType && requestType !== 'all') {
    query += ` AND s.request_type_id = $${params.length + 1}`;
    params.push(requestType);
  }

  const orderBy = safeSort === 'company_name'
    ? 'COALESCE(cc.razao_social, cc.nome)'
    : safeSort === 'request_type_name'
      ? 'st.name'
      : `s.${safeSort}`;

  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const solicitations = (await db.query(query, params)).rows as any[];
  const solicitationTypesResult = await getSolicitationTypes();
  const solicitationTypes = solicitationTypesResult.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Solicitacoes</h2>
      </div>

      <form className="grid gap-4 rounded-lg border bg-white p-4 md:grid-cols-4">
        <div className="space-y-2">
          <label htmlFor="company" className="text-sm font-medium">Empresa</label>
          <input
            id="company"
            name="company"
            defaultValue={company}
            placeholder="Razao social"
            className="h-10 w-full rounded-md border px-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="subject" className="text-sm font-medium">Assunto</label>
          <input
            id="subject"
            name="subject"
            defaultValue={subject}
            placeholder="Resumo da demanda"
            className="h-10 w-full rounded-md border px-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="request_type" className="text-sm font-medium">Tipo</label>
          <select
            id="request_type"
            name="request_type"
            defaultValue={requestType || 'all'}
            className="h-10 w-full rounded-md border px-3 text-sm"
          >
            <option value="all">Todos</option>
            {solicitationTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          <select
            id="status"
            name="status"
            defaultValue={status || 'all'}
            className="h-10 w-full rounded-md border px-3 text-sm"
          >
            <option value="all">Todos</option>
            <option value="SUBMITTED">Pendente</option>
            <option value="RECTIFIED">Retificada</option>
            <option value="COMPLETED">Concluida</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
        <div className="md:col-span-4 flex justify-end gap-2">
          <a href="/admin/solicitations" className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium">
            Limpar
          </a>
          <button type="submit" className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            Filtrar
          </button>
        </div>
      </form>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <ColumnHeader column="protocol_number" title="Protocolo" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="created_at" title="Data Solicitacao" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="company_name" title="Empresa" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="request_type_name" title="Tipo" />
              </TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>
                <ColumnHeader column="subject" title="Assunto" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="status" title="Status" />
              </TableHead>
              <TableHead className="text-center">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solicitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Nenhuma solicitacao encontrada.
                </TableCell>
              </TableRow>
            ) : (
              solicitations.map((solicitation) => (
                <TableRow key={solicitation.id}>
                  <TableCell className="font-mono text-xs">{solicitation.protocol_number}</TableCell>
                  <TableCell>{solicitation.created_at ? format(new Date(solicitation.created_at), 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                  <TableCell>{solicitation.company_name}</TableCell>
                  <TableCell>{solicitation.request_type_name}</TableCell>
                  <TableCell>{solicitation.department_name}</TableCell>
                  <TableCell>{solicitation.subject}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold
                      ${solicitation.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${solicitation.status === 'RECTIFIED' ? 'bg-orange-100 text-orange-800' : ''}
                      ${solicitation.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : ''}
                      ${solicitation.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                    `}>
                      {getSolicitationStatusLabel(solicitation.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <SolicitationActions
                      solicitationId={solicitation.id}
                      status={solicitation.status}
                      subject={solicitation.subject}
                      isAdmin
                    />
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
