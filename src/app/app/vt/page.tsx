import db from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { SearchInput } from '@/components/ui/search-input';
import { ColumnHeader } from '@/components/ui/column-header';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Plus, Eye, Edit, Trash } from 'lucide-react';
import Link from 'next/link';
import { getUserPermissions } from '@/app/actions/permissions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const dynamic = 'force-dynamic';

export default async function ClientVTPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await getSession();
  if (!session || session.role !== 'client_user') redirect('/login');

  const permissions = await getUserPermissions();
  const canView = permissions.includes('vt.view');
  const canCreate = permissions.includes('vt.create');

  if (!canView) redirect('/app');

  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';

  const safeSort = ['created_at', 'reference_month', 'status'].includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const activeCompanyId = session.active_company_id;
  if (!activeCompanyId) return <div className="p-8 text-center text-muted-foreground">Selecione uma empresa.</div>;

  let query = `
    SELECT 
      vt.*,
      cc.nome as company_name,
      (SELECT COUNT(*) FROM transport_voucher_employees WHERE transport_voucher_id = vt.id) as total_employees
    FROM transport_vouchers vt
    JOIN client_companies cc ON vt.company_id = cc.id
    WHERE vt.company_id = $1
  `;

  const params: any[] = [activeCompanyId];

  if (q) {
    // Busca simples por mês/ano se for número
    const numQ = parseInt(q);
    if (!isNaN(numQ)) {
        query += ` AND (vt.reference_month = $${params.length + 1} OR vt.reference_year = $${params.length + 1})`;
        params.push(numQ);
    }
  }
                  
  query += ` ORDER BY vt.${safeSort} ${safeOrder}`;

  const vts = (await db.query(query, params)).rows as any[];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vale Transporte</h2>
        <div className="flex items-center gap-2">
          {canCreate ? (
            <Link href="/app/vt/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Pedido VT
              </Button>
            </Link>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div tabIndex={0}>
                    <Button disabled>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Pedido VT
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você não tem permissão para criar novos pedidos.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <SearchInput placeholder="Buscar por mês ou ano..." />
      </div>

      <div className="border rounded-md bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referência</TableHead>
              <TableHead>
                <ColumnHeader column="created_at" title="Data Solicitação" />
              </TableHead>
              <TableHead>Qtd. Funcionários</TableHead>
              <TableHead>
                <ColumnHeader column="status" title="Status" />
              </TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vts.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        Nenhum pedido de vale transporte encontrado.
                    </TableCell>
                </TableRow>
            ) : (
                vts.map((vt) => {
                const formattedCreatedAt = vt.created_at ? format(new Date(vt.created_at), 'dd/MM/yyyy HH:mm') : '-';
                const ref = `${String(vt.reference_month).padStart(2, '0')}/${vt.reference_year}`;

                return (
                <TableRow key={vt.id}>
                    <TableCell className="font-medium">{ref}</TableCell>
                    <TableCell>{formattedCreatedAt}</TableCell>
                    <TableCell>{vt.total_employees}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${vt.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : ''}
                        ${vt.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${vt.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : ''}
                        ${vt.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                      `}>
                        {
                          vt.status === 'DRAFT' ? 'Rascunho' : 
                          vt.status === 'PENDING' ? 'Aguardando' :
                          vt.status === 'COMPLETED' ? 'Concluído' :
                          vt.status === 'CANCELLED' ? 'Cancelado' : 
                          vt.status
                        }
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            <Link href={`/app/vt/${vt.id}/view`}>
                                <Button variant="outline" size="sm" title="Visualizar">
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </Link>
                            {vt.status === 'DRAFT' && canCreate && (
                                <Link href={`/app/vt/${vt.id}/edit`}>
                                    <Button variant="outline" size="sm" title="Editar Rascunho">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </TableCell>
                </TableRow>
                );
                })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}