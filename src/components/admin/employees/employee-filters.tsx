'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from "@/lib/utils";
import { searchCompanies } from '@/app/actions/search-companies';
import { useDebounce } from 'use-debounce';

export function EmployeeFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    name: searchParams.get('name') || '',
    company: searchParams.get('company') || '',
    cpf: searchParams.get('cpf') || '',
    admission_start: searchParams.get('admission_start') || '',
    admission_end: searchParams.get('admission_end') || '',
    status: searchParams.get('status') || 'all',
  });

  // Company Autocomplete State
  const [companySuggestions, setCompanySuggestions] = useState<{id: string, razao_social: string}[]>([]);
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [debouncedCompany] = useDebounce(filters.company, 300);
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
    if (filters.name) params.set('name', filters.name);
    if (filters.company && filters.company.length >= 3) params.set('company', filters.company);
    if (filters.cpf) params.set('cpf', filters.cpf);
    if (filters.admission_start) params.set('admission_start', filters.admission_start);
    if (filters.admission_end) params.set('admission_end', filters.admission_end);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);

    // Maintain sort order if present
    if (searchParams.get('sort')) params.set('sort', searchParams.get('sort')!);
    if (searchParams.get('order')) params.set('order', searchParams.get('order')!);

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
    const defaultFilters = {
      name: '',
      company: '',
      cpf: '',
      admission_start: '',
      admission_end: '',
      status: 'all',
    };
    setFilters(defaultFilters);
    router.push('?');
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return undefined;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded-md border">
      {/* First Row: Name and Company */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input 
                placeholder="Nome do funcionário" 
                value={filters.name} 
                onChange={(e) => handleFilterChange('name', e.target.value)} 
            />
        </div>

        {/* Company */}
        <div className="space-y-2 relative" ref={companyWrapperRef}>
            <label className="text-sm font-medium">Empresa</label>
            <div className="relative">
                <Input 
                    placeholder="Razão Social (min 3 chars)" 
                    value={filters.company} 
                    onChange={(e) => {
                        handleFilterChange('company', e.target.value);
                        setShowCompanySuggestions(true);
                    }}
                    onFocus={() => {
                        if (filters.company.length >= 3) setShowCompanySuggestions(true);
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
                                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                onClick={() => {
                                    handleFilterChange('company', company.razao_social);
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
      </div>

      {/* Second Row: CPF, Admission Date Interval, Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* CPF */}
        <div className="space-y-2">
            <label className="text-sm font-medium">CPF</label>
            <Input 
                placeholder="CPF" 
                value={filters.cpf} 
                onChange={(e) => handleFilterChange('cpf', e.target.value)} 
            />
        </div>

        {/* Admission Date Start */}
        <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium">Admissão (Início)</label>
            <DatePicker
                date={parseDate(filters.admission_start)}
                setDate={(date) => handleFilterChange('admission_start', date ? format(date, 'yyyy-MM-dd') : '')}
                placeholder="Selecione"
            />
        </div>

        {/* Admission Date End */}
        <div className="space-y-2 flex flex-col">
            <label className="text-sm font-medium">Admissão (Fim)</label>
            <DatePicker
                date={parseDate(filters.admission_end)}
                setDate={(date) => handleFilterChange('admission_end', date ? format(date, 'yyyy-MM-dd') : '')}
                placeholder="Selecione"
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
                    <SelectItem value="Admitido">Admitido</SelectItem>
                    <SelectItem value="Transferido">Transferido</SelectItem>
                    <SelectItem value="Desligado">Desligado</SelectItem>
                    <SelectItem value="Férias">Férias</SelectItem>
                    <SelectItem value="Afastado">Afastado</SelectItem>
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
