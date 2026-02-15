import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getRolePermissions } from '@/app/actions/permissions';
import { createProcess } from '@/app/actions/societario-processes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NewProcessFields } from '@/components/societario/new-process-fields';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewProcessoPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/login');
  const perms = await getRolePermissions(session.role);
  if (!perms.includes('societario.edit')) {
    return <div className="p-6">Sem permissão</div>;
  }

  async function action(data: FormData) {
    'use server';
    return await createProcess(data);
  }

  const params = await searchParams;
  const selectedCompanyId = typeof params.company_id === 'string' ? params.company_id : '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo Processo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={action} className="space-y-6">
            <NewProcessFields initialCompanyId={selectedCompanyId} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
