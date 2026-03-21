'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Search, Loader2 } from 'lucide-react';
import { searchCompanies } from '@/app/actions/search-companies';
import { useDebounce } from 'use-debounce';

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

  // Company Autocomplete State
  const [companySuggestions, setCompanySuggestions] = useState<{id: string, razao_social: string}[]>([]);
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [debouncedCompany] = useDebounce(filters.razao_social, 300);
  const companyWrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (companyWrapperRef.current && !companyWrapperRef.current.contains(event.target as Node)) {
            setShowCompanySuggestions(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch company suggestions
  useEffect(() => {
    const fetchCompanies = async () => {
        if (debouncedCompany.length >= 3) {
            setIsSearchingCompany(true);
            try {
                const results = await searchCompanies(debouncedCompany);
                setCompanySuggestions(results);
                setShowCompanySuggestions(true);
            } catch (error) {
                console.error("Error searching companies:", error);
            } finally {
                setIsSearchingCompany(false);
            }
        } else {
            setCompanySuggestions([]);
            setShowCompanySuggestions(false);
        }
    };

    fetchCompanies();
  }, [debouncedCompany]);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Razão Social */}
        <div className="space-y-2 relative" ref={companyWrapperRef}>
            <label className="text-sm font-medium">Razão Social</label>
            <div className="relative">
                <Input 
                    placeholder="Razão Social (min 3 chars)" 
                    value={filters.razao_social} 
                    onChange={(e) => {
                        handleFilterChange('razao_social', e.target.value);
                        setShowCompanySuggestions(true);
                    }}
                    onFocus={() => {
                        if (filters.razao_social.length >= 3) setShowCompanySuggestions(true);
                    }}
                    className="pr-8"
                />
                {isSearchingCompany && (
                    <div className="absolute right-2 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>
            
            {showCompanySuggestions && companySuggestions.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 shadow-lg rounded-md mt-1 max-h-60 overflow-y-auto">
                    <ul className="p-1">
                        {companySuggestions.map((company) => (
                            <li 
                                key={company.id}
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                    handleFilterChange('razao_social', company.razao_social);
                                    setShowCompanySuggestions(false);
                                }}
                            >
                                {company.razao_social}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
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

        {/* CNPJ */}
        <div className="space-y-2">
            <label className="text-sm font-medium">CNPJ</label>
            <Input 
                placeholder="00.000.000/0000-00" 
                value={filters.cnpj} 
                onChange={(e) => handleFilterChange('cnpj', e.target.value)} 
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
