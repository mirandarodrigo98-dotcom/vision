import db from '@/lib/db';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserPermissions } from '@/app/actions/permissions';
import { getSolicitationStatusLabel } from '@/lib/solicitations';
import { ensureSolicitationsTables } from '@/lib/solicitations-db';
import { getSolicitationTypes } from '@/app/actions/solicitation-types';
import { SolicitationActions } from '@/components/solicitations/solicitation-actions';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ClientSolicitationsPageClient } from './page-client';

export const dynamic = 'force-dynamic';

interface ClientSolicitationsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ClientSolicitationsPage({ searchParams }: ClientSolicitationsPageProps) {
  const session = await getSession();
  if (!session || session.role !== 'client_user') redirect('/login');

  const permissions = await getUserPermissions();
  const canView = permissions.includes('solicitations.view');
  const canCreate = permissions.includes('solicitations.create');

  if (!canView) {
    redirect('/app');
  }

  const activeCompanyId = session.active_company_id;
  if (!activeCompanyId) {
    return <div className="p-8 text-center text-muted-foreground">Selecione uma empresa.</div>;
  }

  await ensureSolicitationsTables();

  const resolvedSearchParams = await searchParams;
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  const allowedSorts = ['protocol_number', 'created_at', 'subject', 'status'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = `
    SELECT
      s.*,
      st.name AS request_type_name,
      d.name AS department_name
    FROM solicitations s
    JOIN solicitation_types st ON st.id = s.request_type_id
    JOIN departments d ON d.id = s.department_id
    WHERE s.company_id = $1
  `;
  const params: any[] = [activeCompanyId];

  if (q) {
    const like = `%${q}%`;
    query += ` AND (
      s.protocol_number ILIKE $2
      OR s.subject ILIKE $3
      OR st.name ILIKE $4
      OR d.name ILIKE $5
    )`;
    params.push(like, like, like, like);
  }

  query += ` ORDER BY s.${safeSort} ${safeOrder}`;

  const solicitations = (await db.query(query, params)).rows as any[];
  const solicitationTypesResult = await getSolicitationTypes({ activeOnly: true });
  const solicitationTypes = solicitationTypesResult.data || [];
  const canOpenModal = canCreate && solicitationTypes.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Solicitacoes</h1>
        {canOpenModal ? (
          <ClientSolicitationsPageClient requestTypes={solicitationTypes}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Solicitacao
            </Button>
          </ClientSolicitationsPageClient>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div tabIndex={0}>
                  <Button disabled>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Solicitacao
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {!canCreate
                    ? 'Voce nao tem permissao para criar solicitacoes.'
                    : 'Nao ha tipos de solicitacao ativos cadastrados.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="flex items-center justify-between">
        <SearchInput placeholder="Buscar por protocolo, assunto, tipo ou departamento..." />
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocolo</TableHead>
              <TableHead>Data Solicitacao</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Departamento</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {solicitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Nenhuma solicitacao encontrada.
                </TableCell>
              </TableRow>
            ) : (
              solicitations.map((solicitation) => (
                <TableRow key={solicitation.id}>
                  <TableCell className="font-mono text-xs">{solicitation.protocol_number}</TableCell>
                  <TableCell>{solicitation.created_at ? format(new Date(solicitation.created_at), 'dd/MM/yyyy') : '-'}</TableCell>
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
