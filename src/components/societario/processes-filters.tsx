 'use client';
 
 import { useRouter, useSearchParams } from 'next/navigation';
 import { useState } from 'react';
 import { Input } from '@/components/ui/input';
 import { Button } from '@/components/ui/button';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { X, Search } from 'lucide-react';
 
 export function ProcessFilters() {
   const router = useRouter();
   const searchParams = useSearchParams();
 
   const [filters, setFilters] = useState({
     company: searchParams.get('company') || '',
     cnpj: searchParams.get('cnpj') || '',
     type: searchParams.get('type') || 'all',
     status: searchParams.get('status') || 'all',
   });
 
   const handleFilter = () => {
     const params = new URLSearchParams();
     if (filters.company) params.set('company', filters.company);
     if (filters.cnpj) params.set('cnpj', filters.cnpj);
     if (filters.type && filters.type !== 'all') params.set('type', filters.type);
     if (filters.status && filters.status !== 'all') params.set('status', filters.status);
 
     const newQuery = params.toString();
     const currentQuery = searchParams.toString();
     if (newQuery !== currentQuery) {
       router.push(`?${newQuery}`);
     }
   };
 
   const clearFilters = () => {
     setFilters({
       company: '',
       cnpj: '',
       type: 'all',
       status: 'all',
     });
     router.push('?');
   };
 
   const handleChange = (key: string, value: string) => {
     setFilters(prev => ({ ...prev, [key]: value }));
   };
 
   return (
     <div className="space-y-4 bg-white p-4 rounded-md border">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="space-y-2">
           <label className="text-sm font-medium">Empresa (Razão Social)</label>
           <Input
             placeholder="Digite a empresa"
             value={filters.company}
             onChange={(e) => handleChange('company', e.target.value)}
           />
         </div>
         <div className="space-y-2">
           <label className="text-sm font-medium">CNPJ</label>
           <Input
             placeholder="Somente números"
             value={filters.cnpj}
             onChange={(e) => handleChange('cnpj', e.target.value)}
           />
         </div>
         <div className="space-y-2">
           <label className="text-sm font-medium">Tipo</label>
           <Select value={filters.type} onValueChange={(val) => handleChange('type', val)}>
             <SelectTrigger>
               <SelectValue placeholder="Todos" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todos</SelectItem>
               <SelectItem value="CONSTITUICAO">Constituição</SelectItem>
               <SelectItem value="ALTERACAO">Alteração</SelectItem>
               <SelectItem value="BAIXA">Baixa</SelectItem>
             </SelectContent>
           </Select>
         </div>
         <div className="space-y-2">
           <label className="text-sm font-medium">Status</label>
           <Select value={filters.status} onValueChange={(val) => handleChange('status', val)}>
             <SelectTrigger>
               <SelectValue placeholder="Todos" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todos</SelectItem>
               <SelectItem value="NAO_INICIADO">Não iniciado</SelectItem>
               <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
               <SelectItem value="CONCLUIDO">Concluído</SelectItem>
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
