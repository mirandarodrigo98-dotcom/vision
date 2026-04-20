import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalculatorIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

export default async function ContabilidadePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('contabilidade.faturamento.view')) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-500">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contabilidade</h1>
        <p className="text-muted-foreground mt-2">
          Área destinada ao controle contábil e apuração de faturamento.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/contabilidade/faturamento" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <CalculatorIcon className="h-5 w-5" />
                  Faturamento
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Acompanhamento do faturamento das empresas de Lucro Presumido e Lucro Real.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/contabilidade/faturamento-sn" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5" />
                  Faturamento SN
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Faturamento das empresas enquadradas no Simples Nacional.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
