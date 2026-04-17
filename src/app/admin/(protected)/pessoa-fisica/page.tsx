import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calculator } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pessoa Física | VISION',
};

export default function PessoaFisicaPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Pessoa Física</h2>
      </div>
      <p className="text-muted-foreground mt-2">
        Gerencie as declarações e serviços de pessoa física.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Imposto de Renda
            </CardTitle>
            <CardDescription>
              Controle de declarações de Imposto de Renda Pessoa Física (IRPF).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/pessoa-fisica/imposto-renda">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Carnê Leão
            </CardTitle>
            <CardDescription>
              Controle de rendimentos e pagamentos (Carnê Leão).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/pessoa-fisica/carne-leao">
              <Button className="w-full">Acessar Módulo</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}