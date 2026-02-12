import Link from 'next/link';
import db from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ColumnHeader } from '@/components/ui/column-header';
import { EmployeeImportDialog } from '@/components/admin/employees/employee-import-dialog';
import { EmployeeActions } from '@/components/admin/employees/employee-actions';
import { EmployeeFilters } from '@/components/admin/employees/employee-filters';

interface EmployeesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  // Force re-render comment to fix ReferenceError cache
  const resolvedSearchParams = await searchParams;
  const sort = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'code';
  const order = typeof resolvedSearchParams.order === 'string' ? resolvedSearchParams.order : 'asc';
  
  // Filters
  const name = typeof resolvedSearchParams.name === 'string' ? resolvedSearchParams.name : '';
  const company = typeof resolvedSearchParams.company === 'string' ? resolvedSearchParams.company : '';
  const cpf = typeof resolvedSearchParams.cpf === 'string' ? resolvedSearchParams.cpf : '';
  const admissionStart = typeof resolvedSearchParams.admission_start === 'string' ? resolvedSearchParams.admission_start : '';
  const admissionEnd = typeof resolvedSearchParams.admission_end === 'string' ? resolvedSearchParams.admission_end : '';
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : '';

  // Whitelist allowed sort columns to prevent SQL injection
  const allowedSorts = ['code', 'name', 'company_name', 'cpf', 'admission_date', 'created_at', 'status'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'code';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Build query
  let query = `
    SELECT e.*, c.nome as company_name 
    FROM employees e
    JOIN client_companies c ON e.company_id = c.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (name) {
    query += ` AND e.name LIKE ?`;
    params.push(`%${name}%`);
  }
  
  if (company && company.length >= 3) {
    query += ` AND c.razao_social LIKE ?`;
    params.push(`%${company}%`);
  }

  if (cpf) {
    query += ` AND e.cpf LIKE ?`;
    params.push(`%${cpf}%`);
  }
  
  if (admissionStart) {
    query += ` AND e.admission_date >= ?`;
    params.push(admissionStart);
  }
  
  if (admissionEnd) {
    query += ` AND e.admission_date <= ?`;
    params.push(admissionEnd);
  }

  if (status && status !== 'all') {
    query += ` AND e.status = ?`;
    params.push(status);
  }

  // Handle special case for company_name sorting and numeric code sorting
  let orderBy = `e.${safeSort}`;
  
  if (safeSort === 'company_name') {
    orderBy = 'c.nome';
  } else if (safeSort === 'code') {
    orderBy = 'CAST(e.code AS INTEGER)';
  }
  
  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const employees = await db.prepare(query).all(...params) as Array<{
    id: string;
    code: string;
    name: string;
    company_name: string;
    cpf: string;
    admission_date: string;
    created_at: string;
    is_active: number;
    status: string;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Funcionários</h1>
        <div className="flex gap-2">
          <EmployeeImportDialog />
          <Link href="/admin/employees/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Funcionário
            </Button>
          </Link>
        </div>
      </div>

      <EmployeeFilters />

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <ColumnHeader column="code" title="Código" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="name" title="Nome" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="company_name" title="Empresa" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="cpf" title="CPF" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="admission_date" title="Admissão" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="status" title="Status" />
              </TableHead>
              <TableHead>
                <ColumnHeader column="created_at" title="Criado em" />
              </TableHead>
              <TableHead className="w-[100px] text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum funcionário encontrado com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => {
                let admissionDate = '-';
                try {
                   if (employee.admission_date) {
                     const date = new Date(employee.admission_date);
                     if (!isNaN(date.getTime())) {
                       admissionDate = format(date, 'dd/MM/yyyy');
                     }
                   }
                } catch (e) {}

                let createdAt = '-';
                try {
                   if (employee.created_at) {
                     const date = new Date(employee.created_at);
                     if (!isNaN(date.getTime())) {
                       createdAt = format(date, 'dd/MM/yyyy HH:mm');
                     }
                   }
                } catch (e) {}

                return (
                <TableRow key={employee.id}>
                  <TableCell>{employee.code || '-'}</TableCell>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.company_name}</TableCell>
                  <TableCell>{employee.cpf || '-'}</TableCell>
                  <TableCell suppressHydrationWarning>
                    {admissionDate}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      employee.status === 'Admitido' ? 'bg-green-100 text-green-800' :
                      employee.status === 'Desligado' ? 'bg-red-100 text-red-800' :
                      employee.status === 'Transferido' ? 'bg-blue-100 text-blue-800' :
                      employee.status === 'Férias' ? 'bg-yellow-100 text-yellow-800' :
                      employee.status === 'Afastado' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {employee.status || 'Admitido'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm" suppressHydrationWarning>
                    {createdAt}
                  </TableCell>
                  <TableCell>
                    <EmployeeActions id={employee.id} isActive={employee.is_active === 1} />
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