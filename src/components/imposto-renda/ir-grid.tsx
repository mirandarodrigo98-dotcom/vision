'use client';

import { IRDeclaration } from '@/app/actions/imposto-renda';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EyeIcon } from '@heroicons/react/24/outline';
import { PlusIcon } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'Não Iniciado': 'bg-slate-500',
  'Em andamento': 'bg-blue-500',
  'Pendente': 'bg-yellow-500',
  'Em Validação': 'bg-purple-500',
  'Cancelado': 'bg-red-500',
  'Transmitido': 'bg-green-500',
  'Processado': 'bg-emerald-500',
  'Malha Fina': 'bg-orange-500'
};

interface IRGridProps {
  declarations: IRDeclaration[];
}

export function IRGrid({ declarations }: IRGridProps) {
  return (
    <Card className="col-span-4 lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Declarações</CardTitle>
        <Link href="/admin/pessoa-fisica/imposto-renda/novo">
          <Button size="sm">
            <PlusIcon className="h-4 w-4 mr-2" />
            Nova Declaração
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Exercício</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Recebido</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {declarations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma declaração encontrada.
                  </td>
                </tr>
              ) : (
                declarations.map((decl) => (
                  <tr key={decl.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{decl.name}</td>
                    <td className="px-4 py-3">{decl.type}</td>
                    <td className="px-4 py-3">{decl.year}</td>
                    <td className="px-4 py-3">
                      <Badge className={`${STATUS_COLORS[decl.status] || 'bg-gray-500'} hover:${STATUS_COLORS[decl.status] || 'bg-gray-500'}`}>
                        {decl.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {decl.is_received ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">Sim</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">Não</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/pessoa-fisica/imposto-renda/${decl.id}`}>
                        <Button variant="ghost" size="icon" title="Detalhes">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
