import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReceiptText, FileText } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FiscalPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const permissions = await getUserPermissions();
  if (!permissions.includes('fiscal.view')) {
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
        <h1 className="text-3xl font-bold tracking-tight">Fiscal</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as rotinas e obrigações fiscais.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Simples Nacional
            </CardTitle>
            <CardDescription>
              Acesse a área de trabalho para gerenciar rotinas e faturamento do Simples Nacional.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/fiscal/simples-nacional">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Tabela de Imposto de Renda
            </CardTitle>
            <CardDescription>
              Tabelas, faixas e cálculos do Imposto de Renda (IRPF).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/fiscal/tabela-imposto-renda">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Tabela de INSS
            </CardTitle>
            <CardDescription>
              Tabelas de contribuição e regras do INSS 2026.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/fiscal/tabela-inss">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-indigo-600" />
              Automação GNRE
            </CardTitle>
            <CardDescription>
              Emissão e transmissão de Lotes GNRE para a SEFAZ via WebService.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/fiscal/gnre">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Conferência ICMS-ST
            </CardTitle>
            <CardDescription>
              Valide e calcule o ICMS-ST através da importação de notas fiscais XML.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/fiscal/conferencia-st">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-600" />
              Regras Fiscais ST
            </CardTitle>
            <CardDescription>
              Cadastro e importação de MVAs e regras de ST por Estado e NCM/CEST.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/fiscal/regras-st">
              <Button variant="outline" className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
