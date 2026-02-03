import db from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { SearchInput } from '@/components/ui/search-input';
import { ColumnHeader } from '@/components/ui/column-header';
import { AdmissionActions } from '@/components/admissions/admission-actions';

interface AdminAdmissionsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminAdmissionsPage({ searchParams }: AdminAdmissionsPageProps) {
  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';

  // Whitelist allowed sort columns
  const allowedSorts = ['protocol_number', 'created_at', 'company_name', 'employee_full_name', 'job_role', 'status'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let query = `
    SELECT 
      ar.*,
      cc.nome as company_name,
      aa.storage_path as file_path
    FROM admission_requests ar
    JOIN client_companies cc ON ar.company_id = cc.id
    LEFT JOIN admission_attachments aa ON ar.id = aa.admission_id
  `;

  const params: any[] = [];

  if (q) {
    query += ` WHERE (ar.protocol_number LIKE ? OR ar.employee_full_name LIKE ? OR cc.nome LIKE ?)`;
    const likeQ = `%${q}%`;
    params.push(likeQ, likeQ, likeQ);
  }

  const orderBy = safeSort === 'company_name' ? 'cc.nome' : `ar.${safeSort}`;
  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const admissions = await db.prepare(query).all(...params) as any[];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Admissões Recebidas</h2>
      </div>

      <div className="flex items-center justify-between">
        <SearchInput placeholder="Buscar por protocolo, funcionário ou empresa..." />
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <ColumnHeader column="protocol_number" title="Protocolo" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="created_at" title="Data Recebimento" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="company_name" title="Empresa" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="employee_full_name" title="Funcionário" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="job_role" title="Cargo" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="status" title="Status" />
              </TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admissions.map((adm) => {
              let formattedDate = 'Data inválida';
              try {
                if (adm.created_at) {
                    formattedDate = format(new Date(adm.created_at), 'dd/MM/yyyy HH:mm');
                }
              } catch (e) {
                console.error('Error formatting date', e);
              }

              return (
              <TableRow key={adm.id}>
                <TableCell className="font-mono text-xs">{adm.protocol_number}</TableCell>
                <TableCell>{formattedDate}</TableCell>
                <TableCell>{adm.company_name}</TableCell>
                <TableCell>{adm.employee_full_name}</TableCell>
                <TableCell>{adm.job_role}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${adm.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' : ''}
                    ${adm.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' : ''}
                    ${adm.status === 'RECTIFIED' ? 'bg-orange-100 text-orange-800' : ''}
                    ${adm.status === 'EMAILED' ? 'bg-green-100 text-green-800' : ''}
                    ${adm.status === 'ERROR' ? 'bg-red-100 text-red-800' : ''}
                    ${adm.status === 'CANCELLED' ? 'bg-red-200 text-red-900' : ''}
                  `}>
                    {
                      adm.status === 'SUBMITTED' ? 'Enviado' : 
                      adm.status === 'RECTIFIED' ? 'Retificado' :
                      adm.status === 'ERROR' ? 'Erro' : 
                      adm.status === 'DRAFT' ? 'Rascunho' : 
                      adm.status === 'CANCELLED' ? 'Cancelado' : 
                      adm.status === 'EMAILED' ? 'Enviado' :
                      adm.status
                    }
                  </span>
                </TableCell>
                <TableCell>
                  <AdmissionActions 
                    admissionId={adm.id}
                    admissionDate={adm.admission_date}
                    status={adm.status}
                    employeeName={adm.employee_full_name}
                    isAdmin={true}
                  />
                </TableCell>
              </TableRow>
            )})}
            {admissions.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma admissão encontrada.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
