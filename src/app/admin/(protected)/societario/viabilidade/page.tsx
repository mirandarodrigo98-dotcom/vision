import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ViabilidadesListPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('societario.view')) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin/societario" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Viabilidades</h1>
          </div>
          <p className="text-muted-foreground mt-1 ml-7">
            Gerencie as viabilidades em andamento e concluídas.
          </p>
        </div>
        <Link href="/admin/societario/viabilidade/nova">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova Viabilidade
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-md border shadow-sm">
        <div className="p-8 text-center text-gray-500">
          <p>Nenhuma viabilidade registrada ainda.</p>
          <p className="text-sm mt-2">Clique em &quot;Nova Viabilidade&quot; para iniciar um processo.</p>
        </div>
        {/* Futuro componente de DataTable com a listagem real das viabilidades entrará aqui */}
      </div>
    </div>
  );
}
