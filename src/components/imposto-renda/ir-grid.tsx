'use client';

import { IRDeclaration } from '@/app/actions/imposto-renda';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EyeIcon } from '@heroicons/react/24/outline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { ChevronDownIcon, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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

function MultiSelectDropdown({ title, options, selected, onChange }: { title: string, options: string[], selected: string[], onChange: (val: string[]) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between h-8 text-sm px-3 font-normal">
          <span className="truncate">
            {selected.length === 0 ? 'Todos' : selected.length === 1 ? selected[0] : `${selected.length} selecionados`}
          </span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        {options.map(opt => (
          <DropdownMenuCheckboxItem
            key={opt}
            checked={selected.includes(opt)}
            onCheckedChange={(checked) => {
              if (checked) onChange([...selected, opt]);
              else onChange(selected.filter(x => x !== opt));
            }}
          >
            {opt}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface IRGridProps {
  declarations: IRDeclaration[];
}

export function IRGrid({ declarations }: IRGridProps) {
  const years = Array.from(new Set(declarations.map(d => d.year))).sort((a, b) => b - a);
  
  // Filtros (Inputs)
  const [nameFilter, setNameFilter] = useState('');
  const [cpfFilter, setCpfFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [receivedFilter, setReceivedFilter] = useState<string[]>([]);

  // Filtros Aplicados
  const [appliedFilters, setAppliedFilters] = useState({
    name: '',
    cpf: '',
    priority: [] as string[],
    type: [] as string[],
    status: [] as string[],
    received: [] as string[]
  });

  // Ordenação
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Limite de registros e paginação
  const [pageSize, setPageSize] = useState<string>('50');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleFilter = () => {
    setAppliedFilters({
      name: nameFilter,
      cpf: cpfFilter,
      priority: priorityFilter,
      type: typeFilter,
      status: statusFilter,
      received: receivedFilter
    });
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setNameFilter('');
    setCpfFilter('');
    setPriorityFilter([]);
    setTypeFilter([]);
    setStatusFilter([]);
    setReceivedFilter([]);
    setAppliedFilters({
      name: '',
      cpf: '',
      priority: [],
      type: [],
      status: [],
      received: []
    });
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleFilter();
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const formatCpf = (s?: string) => {
    if (!s) return 'Não informado';
    const d = s.replace(/\D/g, '');
    if (d.length !== 11) return s;
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*$/, '$1.$2.$3-$4');
  };

  const formatPhone = (p?: string | null) => {
    if (!p) return '—';
    const str = p.trim();
    if (str.startsWith('+55')) {
      const digits = str.replace('+55', '').replace(/\D/g, '');
      if (digits.length === 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
      } else if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      }
    }
    return str;
  };

  const formatMoney = (val?: number | null) => {
    if (val === null || val === undefined) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const sortData = (data: IRDeclaration[]) => {
    if (!sortConfig) {
      return [...data].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [...data].sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof IRDeclaration];
      let valB: any = b[sortConfig.key as keyof IRDeclaration];

      if (sortConfig.key === 'is_received') {
        valA = a.is_received ? 1 : 0;
        valB = b.is_received ? 1 : 0;
      } else if (sortConfig.key === 'priority') {
         const priorityOrder: Record<string, number> = { 'Baixa': 1, 'Média': 2, 'Alta': 3, 'Crítica': 4 };
         valA = priorityOrder[a.priority || 'Média'] || 0;
         valB = priorityOrder[b.priority || 'Média'] || 0;
      } else if (sortConfig.key === 'service_value') {
         valA = Number(a.service_value || 0);
         valB = Number(b.service_value || 0);
      } else if (sortConfig.key === 'phone') {
         valA = a.phone || '';
         valB = b.phone || '';
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const renderTable = (decls: IRDeclaration[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-center">
        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 select-none">
          <tr>
            <th className="px-4 py-3 text-left cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSort('name')}>
              <div className="flex items-center justify-start gap-1">Nome {renderSortIcon('name')}</div>
            </th>
            <th className="px-4 py-3 cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSort('phone')}>
              <div className="flex items-center justify-center gap-1">Telefone {renderSortIcon('phone')}</div>
            </th>
            <th className="px-4 py-3 cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSort('cpf')}>
              <div className="flex items-center justify-center gap-1">CPF {renderSortIcon('cpf')}</div>
            </th>
            <th className="px-4 py-3 cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSort('priority')}>
              <div className="flex items-center justify-center gap-1">Prioridade {renderSortIcon('priority')}</div>
            </th>
            <th className="px-4 py-3 cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSort('type')}>
              <div className="flex items-center justify-center gap-1">Tipo {renderSortIcon('type')}</div>
            </th>
            <th className="px-4 py-3 cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSort('service_value')}>
              <div className="flex items-center justify-center gap-1">Valor do Serviço {renderSortIcon('service_value')}</div>
            </th>
            <th className="px-4 py-3 cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSort('status')}>
              <div className="flex items-center justify-center gap-1">Status {renderSortIcon('status')}</div>
            </th>
            <th className="px-4 py-3 cursor-pointer hover:bg-muted transition-colors" onClick={() => handleSort('is_received')}>
              <div className="flex items-center justify-center gap-1">Recebido {renderSortIcon('is_received')}</div>
            </th>
            <th className="px-4 py-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {decls.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                Nenhuma declaração encontrada.
              </td>
            </tr>
          ) : (
            decls.map((decl) => (
              <tr key={decl.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium text-left">{decl.name}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatPhone(decl.phone)}</td>
                <td className="px-4 py-3">{formatCpf(decl.cpf)}</td>
                <td className="px-4 py-3">{decl.priority || 'Média'}</td>
                <td className="px-4 py-3">{decl.type}</td>
                <td className="px-4 py-3">{formatMoney(decl.service_value)}</td>
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
          <Tabs defaultValue={years[0].toString()} className="w-full" onValueChange={() => setCurrentPage(1)}>
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
                  onKeyDown={handleKeyDown}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CPF</Label>
                <Input 
                  placeholder="Filtrar por CPF" 
                  value={cpfFilter} 
                  onChange={(e) => setCpfFilter(e.target.value)} 
                  onKeyDown={handleKeyDown}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prioridade</Label>
                <MultiSelectDropdown 
                  title="Prioridade" 
                  options={['Baixa', 'Média', 'Alta', 'Crítica']} 
                  selected={priorityFilter} 
                  onChange={setPriorityFilter} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <MultiSelectDropdown 
                  title="Tipo" 
                  options={['Sócio', 'Particular']} 
                  selected={typeFilter} 
                  onChange={setTypeFilter} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <MultiSelectDropdown 
                  title="Status" 
                  options={Object.keys(STATUS_COLORS)} 
                  selected={statusFilter} 
                  onChange={setStatusFilter} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Recebido</Label>
                <MultiSelectDropdown 
                  title="Recebido" 
                  options={['Sim', 'Não']} 
                  selected={receivedFilter} 
                  onChange={setReceivedFilter} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Registros</Label>
                <Select value={pageSize} onValueChange={(val) => { setPageSize(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="50" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="80">80</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="400">400</SelectItem>
                    <SelectItem value="800">800</SelectItem>
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

            {years.map(year => {
              const filteredData = sortData(
                declarations
                  .filter(d => d.year === year)
                  .filter(d => appliedFilters.name ? d.name.toLowerCase().includes(appliedFilters.name.toLowerCase()) : true)
                  .filter(d => appliedFilters.cpf ? d.cpf.replace(/\D/g, '').includes(appliedFilters.cpf.replace(/\D/g, '')) : true)
                  .filter(d => appliedFilters.priority.length === 0 ? true : appliedFilters.priority.includes(d.priority || 'Média'))
                  .filter(d => appliedFilters.type.length === 0 ? true : appliedFilters.type.includes(d.type))
                  .filter(d => appliedFilters.status.length === 0 ? true : appliedFilters.status.includes(d.status))
                  .filter(d => {
                    if (appliedFilters.received.length === 0) return true;
                    const r = d.is_received ? 'Sim' : 'Não';
                    return appliedFilters.received.includes(r);
                  })
              );

              const totalItems = filteredData.length;
              const size = parseInt(pageSize, 10);
              const totalPages = Math.ceil(totalItems / size);
              const paginatedData = filteredData.slice((currentPage - 1) * size, currentPage * size);

              const renderPagination = () => {
                if (totalPages <= 1) return null;
                const pages = [];
                for (let i = 1; i <= totalPages; i++) {
                  if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
                    pages.push(i);
                  } else if (pages[pages.length - 1] !== '...') {
                    pages.push('...');
                  }
                }

                return (
                  <div className="flex items-center justify-end space-x-1 mt-4">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                      {'<<'}
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      {'<'}
                    </Button>
                    {pages.map((p, i) => (
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">...</span>
                      ) : (
                        <Button
                          key={`page-${p}-${i}`}
                          variant={currentPage === p ? 'default' : 'outline'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCurrentPage(p as number)}
                        >
                          {p}
                        </Button>
                      )
                    ))}
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      {'>'}
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                      {'>>'}
                    </Button>
                  </div>
                );
              };

              return (
                <TabsContent key={year} value={year.toString()}>
                  {renderTable(paginatedData)}
                  {renderPagination()}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
