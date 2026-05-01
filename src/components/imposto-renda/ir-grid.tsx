'use client';

import { IRDeclaration } from '@/app/actions/imposto-renda';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EyeIcon } from '@heroicons/react/24/outline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const STATUS_COLORS: Record<string, string> = {
  'Não Iniciado': 'bg-slate-500',
  'Iniciado': 'bg-blue-900',
  'Pendente': 'bg-red-600',
  'Validada': 'bg-yellow-500',
  'Transmitida': 'bg-orange-500',
  'Processada': 'bg-green-600',
  'Malha Fina': 'bg-pink-600',
  'Retificadora': 'bg-purple-600',
  'Reaberta': 'bg-blue-400',
  'Cancelada': 'bg-slate-900'
};

interface IRGridProps {
  declarations: IRDeclaration[];
}

export function IRGrid({ declarations }: IRGridProps) {
  const years = Array.from(new Set(declarations.map(d => d.year))).sort((a, b) => b - a);
  
  // Filtros (Inputs)
  const [nameFilter, setNameFilter] = useState('');
  const [cpfFilter, setCpfFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('Todas');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [receivedFilter, setReceivedFilter] = useState<string>('Todos');

  // Filtros Aplicados
  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    cpf: '',
    priority: 'Todas',
    type: 'Todos',
    status: 'Todos',
    received: 'Todos'
  });

  // Limite de registros
  const [pageSize, setPageSize] = useState<string>('50');

  const handleFilter = () => {
    setAppliedFilters({
      name: nameFilter,
      cpf: cpfFilter,
      priority: priorityFilter,
      type: typeFilter,
      status: statusFilter,
      received: receivedFilter
    });
  };

  const handleClearFilters = () => {
    setNameFilter('');
    setCpfFilter('');
    setPriorityFilter('Todas');
    setTypeFilter('Todos');
    setStatusFilter('Todos');
    setReceivedFilter('Todos');
    setAppliedFilters({
      name: '',
      cpf: '',
      priority: 'Todas',
      type: 'Todos',
      status: 'Todos',
      received: 'Todos'
    });
  };

  const formatCpf = (s?: string) => {
    if (!s) return 'Não informado';
    const d = s.replace(/\D/g, '');
    if (d.length !== 11) return s;
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*$/, '$1.$2.$3-$4');
  };

  const renderTable = (decls: IRDeclaration[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-center">
        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left">Nome</th>
            <th className="px-4 py-3">CPF</th>
            <th className="px-4 py-3">Prioridade</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Exercício</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Recebido</th>
            <th className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {decls.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                Nenhuma declaração encontrada.
              </td>
            </tr>
          ) : (
            decls.map((decl) => (
              <tr key={decl.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium text-left">{decl.name}</td>
                <td className="px-4 py-3">{formatCpf(decl.cpf)}</td>
                <td className="px-4 py-3">{decl.priority || 'Média'}</td>
                <td className="px-4 py-3">{decl.type}</td>
                <td className="px-4 py-3">{decl.year}</td>
                <td className="px-4 py-3">
                  <Badge className={`${STATUS_COLORS[decl.status] || 'bg-gray-500'} text-white`}>
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
                <td className="px-4 py-3">
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
  );

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Declarações</CardTitle>
      </CardHeader>
      <CardContent>
        {declarations.length === 0 ? (
          renderTable([])
        ) : (
          <Tabs defaultValue={years[0].toString()} className="w-full">
            <TabsList className="mb-4">
              {years.map(year => (
                <TabsTrigger key={year} value={year.toString()}>
                  {year}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6 p-4 border rounded-lg bg-muted/20">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input 
                  placeholder="Filtrar por nome" 
                  value={nameFilter} 
                  onChange={(e) => setNameFilter(e.target.value)} 
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CPF</Label>
                <Input 
                  placeholder="Filtrar por CPF" 
                  value={cpfFilter} 
                  onChange={(e) => setCpfFilter(e.target.value)} 
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prioridade</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Crítica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Sócio">Sócio</SelectItem>
                    <SelectItem value="Particular">Particular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {Object.keys(STATUS_COLORS).map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Recebido</Label>
                <Select value={receivedFilter} onValueChange={setReceivedFilter}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Sim">Sim</SelectItem>
                    <SelectItem value="Não">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Registros</Label>
                <Select value={pageSize} onValueChange={setPageSize}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="50" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-7 flex justify-end gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  Limpar Filtros
                </Button>
                <Button size="sm" onClick={handleFilter}>
                  Filtrar
                </Button>
              </div>
            </div>

            {years.map(year => (
              <TabsContent key={year} value={year.toString()}>
                {renderTable(
                  declarations
                    .filter(d => d.year === year)
                    .filter(d => appliedFilters.name ? d.name.toLowerCase().includes(appliedFilters.name.toLowerCase()) : true)
                    .filter(d => appliedFilters.cpf ? d.cpf.replace(/\D/g, '').includes(appliedFilters.cpf.replace(/\D/g, '')) : true)
                    .filter(d => appliedFilters.priority === 'Todas' ? true : (d.priority || 'Média') === appliedFilters.priority)
                    .filter(d => appliedFilters.type === 'Todos' ? true : d.type === appliedFilters.type)
                    .filter(d => appliedFilters.status === 'Todos' ? true : d.status === appliedFilters.status)
                    .filter(d => {
                      if (appliedFilters.received === 'Todos') return true;
                      if (appliedFilters.received === 'Sim') return d.is_received === true;
                      if (appliedFilters.received === 'Não') return d.is_received === false;
                      return true;
                    })
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .slice(0, parseInt(pageSize, 10))
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
