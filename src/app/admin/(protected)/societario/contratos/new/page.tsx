import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getRolePermissions } from '@/app/actions/permissions';
import { createContract } from '@/app/actions/societario-contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import RichTextEditor from '@/components/ui/rich-text-editor';

export default async function NewContratoPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const perms = await getRolePermissions(session.role);
  if (!perms.includes('societario.edit')) {
    return <div className="p-6">Sem permissão</div>;
  }

  async function action(data: FormData): Promise<void> {
    'use server';
    await createContract(data);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Novo Contrato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <Input name="title" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Conteúdo</label>
              <RichTextEditor name="content" />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
