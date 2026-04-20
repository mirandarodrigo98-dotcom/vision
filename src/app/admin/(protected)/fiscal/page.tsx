import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserPermissions } from '@/app/actions/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon, ReceiptText, FileText } from 'lucide-react';
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
        <Link href="/admin/fiscal/simples-nacional" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5" />
                  Simples Nacional
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Acesse a área de trabalho para gerenciar rotinas e faturamento do Simples Nacional.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/fiscal/tabela-imposto-renda" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Tabela de Imposto de Renda
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Tabelas, faixas e cálculos do Imposto de Renda (IRPF).
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/fiscal/tabela-inss" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Tabela de INSS
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Tabelas de contribuição e regras do INSS 2026.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/fiscal/gnre" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2 text-indigo-600 group-hover:text-[#f97316] transition-colors">
                  <ReceiptText className="h-5 w-5" />
                  Automação GNRE
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Emissão e transmissão de Lotes GNRE para a SEFAZ via WebService.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/fiscal/conferencia-st" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2 text-emerald-600 group-hover:text-[#f97316] transition-colors">
                  <FileText className="h-5 w-5" />
                  Conferência ICMS-ST
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Valide e calcule o ICMS-ST através da importação de notas fiscais XML.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/fiscal/regras-st" className="group">
          <Card className="h-full transition-all hover:border-[#f97316] hover:shadow-sm cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 group-hover:text-[#f97316] transition-colors">
                <div className="flex items-center gap-2 text-slate-600 group-hover:text-[#f97316] transition-colors">
                  <FileText className="h-5 w-5" />
                  Regras Fiscais ST
                </div>
                <ArrowRightIcon className="h-5 w-5 text-[#f97316] opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
              <CardDescription>
                Cadastro e importação de MVAs e regras de ST por Estado e NCM/CEST.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
