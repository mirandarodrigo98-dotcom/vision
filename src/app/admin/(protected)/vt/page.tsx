import db from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { SearchInput } from '@/components/ui/search-input';
import { ColumnHeader } from '@/components/ui/column-header';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Plus, Eye, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { getUserPermissions } from '@/app/actions/permissions';

export const dynamic = 'force-dynamic';

export default async function AdminVTPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await getSession();
  if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

  const permissions = await getUserPermissions();
  const isAdmin = session.role === 'admin';
  const canView = isAdmin || permissions.includes('vt.view');

  if (!canView) redirect('/admin/dashboard');

  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';

  const safeSort = ['created_at', 'reference_month', 'status', 'company_name'].includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = `
    SELECT 
      vt.*,
      cc.nome as company_name,
      (SELECT COUNT(*) FROM transport_voucher_employees WHERE transport_voucher_id = vt.id) as total_employees
    FROM transport_vouchers vt
    JOIN client_companies cc ON vt.company_id = cc.id
    WHERE vt.status != 'DRAFT'
  `;

  const params: any[] = [];

  if (session.role === 'operator') {
      query += ` AND vt.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $${params.length + 1})`;
      params.push(session.user_id);
  }

  if (q) {
    const likeQ = `%${q}%`;
    query += ` AND cc.nome ILIKE $${params.length + 1}`;
    params.push(likeQ);
  }
                  
  const orderBy = safeSort === 'company_name' ? 'cc.nome' : `vt.${safeSort}`;
  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const vts = (await db.query(query, params)).rows as any[];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Vale Transporte</h2>
      </div>

      <div className="flex items-center justify-between">
        <SearchInput placeholder="Buscar por empresa..." />
      </div>

      <div className="border rounded-md bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <ColumnHeader column="company_name" title="Empresa" />
              </TableHead>
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
                    <TableCell colSpan={6} className="h-24 text-center">
                        Nenhum pedido de vale transporte recebido.
                    </TableCell>
                </TableRow>
            ) : (
                vts.map((vt) => {
                const formattedCreatedAt = vt.created_at ? format(new Date(vt.created_at), 'dd/MM/yyyy HH:mm') : '-';
                const ref = `${String(vt.reference_month).padStart(2, '0')}/${vt.reference_year}`;

                return (
                <TableRow key={vt.id}>
                    <TableCell className="font-medium">{vt.company_name}</TableCell>
                    <TableCell>{ref}</TableCell>
                    <TableCell>{formattedCreatedAt}</TableCell>
                    <TableCell>{vt.total_employees}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${vt.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${vt.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : ''}
                        ${vt.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                      `}>
                        {
                          vt.status === 'PENDING' ? 'Aguardando' :
                          vt.status === 'COMPLETED' ? 'Concluído' :
                          vt.status === 'CANCELLED' ? 'Cancelado' : 
                          vt.status
                        }
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            <Link href={`/admin/vt/${vt.id}`}>
                                <Button variant="outline" size="sm" title="Analisar">
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </Link>
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