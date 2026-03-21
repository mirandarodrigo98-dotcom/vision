import db from '@/lib/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { SearchInput } from '@/components/ui/search-input';
import { ColumnHeader } from '@/components/ui/column-header';
import { AdmissionActions } from '@/components/admissions/admission-actions';
import { AdmissionFilters } from '@/components/admissions/admission-filters';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface AdminAdmissionsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminAdmissionsPage({ searchParams }: AdminAdmissionsPageProps) {
  const session = await getSession();
  if (!session) return null;

  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'created_at';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'desc';
  
  // Filters
  const name = typeof resolvedSearchParams.name === 'string' ? resolvedSearchParams.name : '';
  const company = typeof resolvedSearchParams.company === 'string' ? resolvedSearchParams.company : '';
  const startDate = typeof resolvedSearchParams.start_date === 'string' ? resolvedSearchParams.start_date : '';
  const endDate = typeof resolvedSearchParams.end_date === 'string' ? resolvedSearchParams.end_date : '';
  const admissionDate = typeof resolvedSearchParams.admission_date === 'string' ? resolvedSearchParams.admission_date : '';
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : '';

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
    WHERE 1=1
  `;

  const params: any[] = [];

  if (session.role === 'client_user') {
    query += ` AND ar.company_id IN (SELECT company_id FROM user_companies WHERE user_id = ?)`;
    params.push(session.user_id);
  } else if (session.role === 'operator') {
    query += ` AND (ar.company_id IS NULL OR ar.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = ?))`;
    params.push(session.user_id);
  }

  if (name) {
    query += ` AND ar.employee_full_name LIKE ?`;
    params.push(`%${name}%`);
  }

  if (company && company.length >= 3) {
    query += ` AND cc.razao_social LIKE ?`;
    params.push(`%${company}%`);
  }

  if (startDate) {
    query += ` AND ar.created_at >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    // Add 1 day to include the end date fully if it's just a date string, or handle timestamp
    query += ` AND ar.created_at <= ?`;
    params.push(endDate + ' 23:59:59');
  }

  if (admissionDate) {
    query += ` AND ar.admission_date LIKE ?`;
    params.push(admissionDate + '%');
  }

  if (status && status !== 'all') {
    query += ` AND ar.status = ?`;
    params.push(status);
  }

  const orderBy = safeSort === 'company_name' ? 'cc.nome' : `ar.${safeSort}`;
  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const admissionsData = await db.prepare(query).all(...params) as any[];

  // Serialize dates
  const safeToISOString = (dateVal: any) => {
    if (!dateVal) return null;
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch (e) {
      return null;
    }
  };

  const admissions = admissionsData.map(adm => ({
    ...adm,
    admission_date: safeToISOString(adm.admission_date),
    created_at: safeToISOString(adm.created_at),
    updated_at: safeToISOString(adm.updated_at),
    submitted_at: safeToISOString(adm.submitted_at),
    emailed_at: safeToISOString(adm.emailed_at),
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Admissões Recebidas</h2>
      </div>

      <AdmissionFilters />

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
              <TableHead className="text-center">Ações</TableHead>
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
                    ${adm.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${adm.status === 'RECTIFIED' ? 'bg-orange-100 text-orange-800' : ''}
                    ${adm.status === 'EMAILED' ? 'bg-primary/10 text-primary' : ''}
                    ${adm.status === 'COMPLETED' ? 'bg-primary/10 text-primary' : ''}
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
                      adm.status === 'COMPLETED' ? 'Concluído' :
                      adm.status
                    }
                  </span>
                </TableCell>
                <TableCell className="text-center">
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
