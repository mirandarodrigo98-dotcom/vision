import Link from 'next/link';
import db from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { ColumnHeader } from '@/components/ui/column-header';
import { EmployeeImportDialog } from '@/components/admin/employees/employee-import-dialog';
import { QuestorEmployeeImport } from '@/components/admin/employees/questor-employee-import';
import { EmployeeFilters } from '@/components/admin/employees/employee-filters';
import { EmployeeTable } from '@/components/admin/employees/employee-table';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface EmployeesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const session = await getSession();
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
  const allowedSorts = ['code', 'name', 'company_name', 'cnpj', 'cpf', 'admission_date', 'created_at', 'status'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'code';
  const safeOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Build query
  let query = `
    SELECT e.*, COALESCE(c.razao_social, c.nome) as company_name, c.cnpj as cnpj,
    CASE WHEN (
      EXISTS (SELECT 1 FROM dismissals d WHERE d.employee_id = e.id) OR
      EXISTS (SELECT 1 FROM vacations v WHERE v.employee_id = e.id) OR
      EXISTS (SELECT 1 FROM leaves l WHERE l.employee_id = e.id) OR
      EXISTS (SELECT 1 FROM transfer_requests tr WHERE tr.employee_name = e.name)
    ) THEN 1 ELSE 0 END as has_movements
    FROM employees e
    JOIN client_companies c ON e.company_id = c.id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (session) {
    if (session.role === 'client_user') {
      query += ` AND e.company_id IN (SELECT company_id FROM user_companies WHERE user_id = $${params.length + 1})`;
      params.push(session.user_id);
    } else if (session.role === 'operator') {
      query += ` AND (e.company_id IS NULL OR e.company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $${params.length + 1}))`;
      params.push(session.user_id);
    }
  }

  if (name) {
    query += ` AND e.name ILIKE $${params.length + 1}`;
    params.push(`%${name}%`);
  }
  
  if (company && company.length >= 3) {
    query += ` AND c.razao_social ILIKE $${params.length + 1}`;
    params.push(`%${company}%`);
  }

  if (cpf) {
    query += ` AND e.cpf ILIKE $${params.length + 1}`;
    params.push(`%${cpf}%`);
  }
  
  if (admissionStart) {
    query += ` AND e.admission_date >= $${params.length + 1}`;
    params.push(admissionStart);
  }
  
  if (admissionEnd) {
    query += ` AND e.admission_date <= $${params.length + 1}`;
    params.push(admissionEnd);
  }

  if (status && status !== 'all') {
    query += ` AND e.status = $${params.length + 1}`;
    params.push(status);
  }

  // Handle special case for company_name sorting
  let orderBy = \`e.\${safeSort}\`;
  
  if (safeSort === 'company_name') {
    orderBy = 'COALESCE(c.razao_social, c.nome)';
  } else if (safeSort === 'cnpj') {
    orderBy = 'c.cnpj';
  } else if (safeSort === 'code') {
    orderBy = 'e.code';
  }
  
  query += ` ORDER BY ${orderBy} ${safeOrder}`;

  const employeesData = (await db.query(query, [...params])).rows as Array<{
    id: string;
    code: string;
    name: string;
    company_name: string;
    cnpj: string;
    cpf: string;
    admission_date: Date | string | null;
    created_at: Date | string | null;
    updated_at: Date | string | null;
    birth_date: Date | string | null;
    is_active: number;
    status: string;
    has_movements: number;
  }>;

  // Serialize dates to strings to avoid "Server Components render" error with Date objects
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

  const employees = employeesData.map(emp => ({
    ...emp,
    admission_date: safeToISOString(emp.admission_date),
    created_at: safeToISOString(emp.created_at),
    updated_at: safeToISOString(emp.updated_at),
    birth_date: safeToISOString(emp.birth_date),
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Funcionários</h1>
        <div className="flex gap-2">
          <QuestorEmployeeImport />
          <EmployeeImportDialog />
          <Link href="/admin/employees/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Funcionário
            </Button>
          </Link>
        </div>
      </div>

      <EmployeeFilters />

      <EmployeeTable employees={employees} />
    </div>
  );
}