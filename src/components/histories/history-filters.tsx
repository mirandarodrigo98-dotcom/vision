'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useDebounce } from 'use-debounce';
import { Loader2, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchCompanies } from '@/app/actions/search-companies';
import { EMPLOYEE_HISTORY_TYPES } from '@/lib/employee-histories';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function HistoryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    name: searchParams.get('name') || '',
    company: searchParams.get('company') || '',
    status: searchParams.get('status') || 'all',
    request_type: searchParams.get('request_type') || 'all',
    start_date: searchParams.get('start_date') || '',
    end_date: searchParams.get('end_date') || '',
    effective_date: searchParams.get('effective_date') || '',
  });

  const [companySuggestions, setCompanySuggestions] = useState<{ id: string; razao_social: string }[]>([]);
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [debouncedCompany] = useDebounce(filters.company, 300);
  const companyWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (companyWrapperRef.current && !companyWrapperRef.current.contains(event.target as Node)) {
        setShowCompanySuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchCompanies = async () => {
      if (debouncedCompany.length < 3) {
        setCompanySuggestions([]);
        setShowCompanySuggestions(false);
        return;
      }

      setIsSearchingCompany(true);
      try {
        const results = await searchCompanies(debouncedCompany);
        setCompanySuggestions(results);
        setShowCompanySuggestions(true);
      } catch (error) {
        console.error('Error searching companies:', error);
      } finally {
        setIsSearchingCompany(false);
      }
    };

    fetchCompanies();
  }, [debouncedCompany]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (filters.name) params.set('name', filters.name);
    if (filters.company && filters.company.length >= 3) params.set('company', filters.company);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.request_type && filters.request_type !== 'all') params.set('request_type', filters.request_type);
    if (filters.start_date) params.set('start_date', filters.start_date);
    if (filters.end_date) params.set('end_date', filters.end_date);
    if (filters.effective_date) params.set('effective_date', filters.effective_date);

    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({
      name: '',
      company: '',
      status: 'all',
      request_type: 'all',
      start_date: '',
      end_date: '',
      effective_date: '',
    });
    router.push('?');
  };

  const parseDate = (value: string) => {
    if (!value) return undefined;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded-md border mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Funcionário</label>
          <Input
            placeholder="Nome do funcionário"
            value={filters.name}
            onChange={(event) => handleFilterChange('name', event.target.value)}
          />
        </div>

        <div className="space-y-2 relative" ref={companyWrapperRef}>
          <label className="text-sm font-medium">Empresa</label>
          <div className="relative">
            <Input
              placeholder="Razão Social (min 3 chars)"
              value={filters.company}
              onChange={(event) => {
                handleFilterChange('company', event.target.value);
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
                    className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
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

        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo da Solicitação</label>
          <Select value={filters.request_type} onValueChange={(value) => handleFilterChange('request_type', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {EMPLOYEE_HISTORY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="SUBMITTED">Solicitado</SelectItem>
              <SelectItem value="RECTIFIED">Retificado</SelectItem>
              <SelectItem value="COMPLETED">Concluído</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2 flex flex-col">
          <label className="text-sm font-medium">Solicitação (Início)</label>
          <DatePicker
            date={parseDate(filters.start_date)}
            setDate={(date) => handleFilterChange('start_date', date ? format(date, 'yyyy-MM-dd') : '')}
            placeholder="Data inicial"
          />
        </div>

        <div className="space-y-2 flex flex-col">
          <label className="text-sm font-medium">Solicitação (Fim)</label>
          <DatePicker
            date={parseDate(filters.end_date)}
            setDate={(date) => handleFilterChange('end_date', date ? format(date, 'yyyy-MM-dd') : '')}
            placeholder="Data final"
          />
        </div>

        <div className="space-y-2 flex flex-col">
          <label className="text-sm font-medium">Data informada</label>
          <DatePicker
            date={parseDate(filters.effective_date)}
            setDate={(date) => handleFilterChange('effective_date', date ? format(date, 'yyyy-MM-dd') : '')}
            placeholder="Data da alteração"
          />
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
