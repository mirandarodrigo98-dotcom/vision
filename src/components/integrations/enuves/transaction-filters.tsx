'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Search, X } from 'lucide-react';

export interface TransactionFiltersState {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  accountId?: string;
  description?: string;
  minValue?: string;
  maxValue?: string;
}

interface TransactionFiltersProps {
  filters: TransactionFiltersState;
  onFiltersChange: (filters: TransactionFiltersState) => void;
  categories: any[];
  accounts: any[];
}

export function TransactionFilters({
  filters,
  onFiltersChange,
  categories = [],
  accounts = [],
}: TransactionFiltersProps) {
  const [localFilters, setLocalFilters] = useState<TransactionFiltersState>(filters);

  // Sync local filters if parent filters change externally (optional but good practice)
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleDateChange = (field: 'startDate' | 'endDate', date: Date | undefined) => {
    setLocalFilters(prev => ({ ...prev, [field]: date }));
  };

  const handleChange = (field: keyof TransactionFiltersState, value: any) => {
    setLocalFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClear = () => {
    const emptyFilters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  return (
    <div className="bg-muted/30 p-4 rounded-md border space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Data Inicial</Label>
          <DatePicker date={localFilters.startDate} setDate={(d) => handleDateChange('startDate', d)} />
        </div>
        <div className="space-y-2">
            <Label>Data Final</Label>
            <DatePicker date={localFilters.endDate} setDate={(d) => handleDateChange('endDate', d)} />
        </div>
        <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={localFilters.categoryId || "all"} onValueChange={(val) => handleChange('categoryId', val === "all" ? undefined : val)}>
                <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                            {cat.description}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label>Conta</Label>
            <Select value={localFilters.accountId || "all"} onValueChange={(val) => handleChange('accountId', val === "all" ? undefined : val)}>
                <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                            {acc.description}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2 col-span-2">
             <Label>Histórico</Label>
             <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Pesquisar na descrição..." 
                    className="pl-8"
                    value={localFilters.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                />
             </div>
        </div>
        <div className="space-y-2">
            <Label>Valor Mínimo</Label>
            <Input 
                type="number" 
                placeholder="0,00"
                value={localFilters.minValue || ''}
                onChange={(e) => handleChange('minValue', e.target.value)}
            />
        </div>
        <div className="space-y-2">
            <Label>Valor Máximo</Label>
            <Input 
                type="number" 
                placeholder="0,00"
                value={localFilters.maxValue || ''}
                onChange={(e) => handleChange('maxValue', e.target.value)}
            />
        </div>
      </div>
      
      <div className="flex justify-end pt-2 gap-2">
          <Button variant="outline" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
              <X className="mr-2 h-3 w-3" />
              Limpar Filtros
          </Button>
          <Button onClick={handleApplyFilters}>
              <Search className="mr-2 h-4 w-4" />
              Filtrar
          </Button>
      </div>
    </div>
  );
}
