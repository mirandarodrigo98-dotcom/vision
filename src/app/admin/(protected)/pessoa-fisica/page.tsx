import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Pessoa Física | VISION',
};

export default function PessoaFisicaPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Pessoa Física</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/pessoa-fisica/imposto-renda" className="block transition-transform hover:scale-105">
          <Card className="cursor-pointer hover:border-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Imposto de Renda
              </CardTitle>
              <DocumentTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Acessar</div>
              <CardDescription>
                Controle de declarações de IR
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}