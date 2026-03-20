'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Search } from 'lucide-react';

export function CompanyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    razao_social: searchParams.get('razao_social') || '',
    cnpj: searchParams.get('cnpj') || '',
    nome: searchParams.get('nome') || '',
    code: searchParams.get('code') || '',
    status: searchParams.get('status') || 'all',
  });

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (filters.razao_social) params.set('razao_social', filters.razao_social);
    if (filters.cnpj) params.set('cnpj', filters.cnpj);
    if (filters.nome) params.set('nome', filters.nome);
    if (filters.code) params.set('code', filters.code);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);

    const newQuery = params.toString();
    const currentQuery = searchParams.toString();
    
    if (newQuery !== currentQuery) {
        router.push(`?${newQuery}`);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      razao_social: '',
      cnpj: '',
      nome: '',
      code: '',
      status: 'all',
    });
    router.push('?');
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded-md border mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Razão Social */}
        <div className="space-y-2">
            <label className="text-sm font-medium">Razão Social</label>
            <Input 
                placeholder="Razão Social" 
                value={filters.razao_social} 
                onChange={(e) => handleFilterChange('razao_social', e.target.value)} 
            />
        </div>

        {/* CNPJ */}
        <div className="space-y-2">
            <label className="text-sm font-medium">CNPJ</label>
            <Input 
                placeholder="00.000.000/0000-00" 
                value={filters.cnpj} 
                onChange={(e) => handleFilterChange('cnpj', e.target.value)} 
            />
        </div>

        {/* Nome Fantasia */}
        <div className="space-y-2">
            <label className="text-sm font-medium">Nome Fantasia</label>
            <Input 
                placeholder="Nome fantasia" 
                value={filters.nome} 
                onChange={(e) => handleFilterChange('nome', e.target.value)} 
            />
        </div>

        {/* Código */}
        <div className="space-y-2">
            <label className="text-sm font-medium">Código</label>
            <Input 
                placeholder="Código" 
                value={filters.code} 
                onChange={(e) => handleFilterChange('code', e.target.value)} 
            />
        </div>

        {/* Status */}
        <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select 
                value={filters.status} 
                onValueChange={(val) => handleFilterChange('status', val)}
            >
                <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={clearFilters} className="text-muted-foreground">
            <X className="mr-2 h-4 w-4" /> Limpar Filtros
        </Button>
        <Button onClick={handleFilter}>
            <Search className="mr-2 h-4 w-4" /> Filtrar
        </Button>
      </div>
    </div>
  );
}
