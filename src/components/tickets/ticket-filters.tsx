'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Filter } from 'lucide-react';

interface TicketFiltersProps {
  requesters: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  assignees: { id: string; name: string }[];
}

export function TicketFilters({ requesters, departments, assignees }: TicketFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);

  const [filters, setFilters] = useState({
    title: searchParams.get('title') || '',
    status: searchParams.get('status') || 'all',
    requester_id: searchParams.get('requester_id') || 'all',
    department_id: searchParams.get('department_id') || 'all',
    assignee_id: searchParams.get('assignee_id') || 'all',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({
      title: '',
      status: 'all',
      requester_id: 'all',
      department_id: 'all',
      assignee_id: 'all',
      startDate: '',
      endDate: '',
    });
    router.push('?');
  };

  return (
    <div className="mb-6">
      <div className="flex justify-end mb-2">
        <Button 
          variant="ghost" 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-primary hover:text-primary/80"
        >
          <Filter className="w-4 h-4" />
          {isExpanded ? '- Filtros' : '+ Filtros'}
        </Button>
      </div>

      {isExpanded && (
        <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input 
                placeholder="Buscar por título..." 
                value={filters.title}
                onChange={(e) => handleFilterChange('title', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={filters.status} 
                onValueChange={(val) => handleFilterChange('status', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Em Aberto</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                  <SelectItem value="returned">Devolvido</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select 
                value={filters.department_id} 
                onValueChange={(val) => handleFilterChange('department_id', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o departamento" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Solicitante</Label>
              <Select 
                value={filters.requester_id} 
                onValueChange={(val) => handleFilterChange('requester_id', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o solicitante" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all">Todos</SelectItem>
                  {requesters.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Atribuído a</Label>
              <Select 
                value={filters.assignee_id} 
                onValueChange={(val) => handleFilterChange('assignee_id', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all">Todos</SelectItem>
                  {assignees.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <div className="flex gap-2">
                <Input 
                  type="date" 
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
                <Input 
                  type="date" 
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
            <Button onClick={applyFilters}>
              Aplicar Filtros
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}