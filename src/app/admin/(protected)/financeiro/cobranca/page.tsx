import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';

export default function CobrancaPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
          <CurrencyDollarIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cobrança</h1>
          <p className="text-muted-foreground">Integração com Itaú APIs para gestão e consulta de boletos</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
            <CardDescription>Resumo dos recebimentos e inadimplência.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Módulo em desenvolvimento para conectar com Itaú API e trazer status de boletos (liquidados, vencidos, etc).</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consultar Boletos</CardTitle>
            <CardDescription>Busca de boletos via API Itaú.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Use este espaço futuramente para inserir filtros como id_beneficiario, codigo_carteira e nosso_numero.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
