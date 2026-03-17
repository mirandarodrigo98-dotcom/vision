'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Loader2, Save, ArrowLeft, Check, ChevronsUpDown, X } from 'lucide-react';
import { createTeamUser, updateTeamUser, TeamUser } from '@/app/actions/team';
import { Department } from '@/app/actions/departments';
import { AccessSchedule } from '@/types/access-schedule';
import { validateCPF } from '@/lib/validators';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TeamFormProps {
    departments: Department[];
    schedules: AccessSchedule[];
    companies: any[];
    initialData?: TeamUser & { restricted_companies?: string[] };
    onCancel: () => void;
    onSuccess: () => void;
}

export default function TeamForm({ departments, schedules, companies, initialData, onCancel, onSuccess }: TeamFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [openCompanies, setOpenCompanies] = useState(false);
    const [searchCompany, setSearchCompany] = useState('');
    const [showRestrictionPrompt, setShowRestrictionPrompt] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        email: initialData?.email || '',
        cpf: initialData?.cpf || '',
        phone: initialData?.phone || '',
        department_id: initialData?.department_id || '',
        role: initialData?.role || 'operator',
        access_schedule_id: initialData?.access_schedule_id || 'none',
        restricted_company_ids: initialData?.restricted_companies || [],
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const formatCPF = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    };

    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (digits.length <= 10) {
            return digits
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{4})(\d)/, '$1-$2');
        } else {
            return digits
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2');
        }
    };

    const handleChange = (field: string, value: string) => {
        let formattedValue = value;
        if (field === 'cpf') formattedValue = formatCPF(value);
        if (field === 'phone') formattedValue = formatPhone(value);

        setFormData(prev => ({ ...prev, [field]: formattedValue }));
        
        // Clear error when user types
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
        if (!formData.email.trim()) newErrors.email = 'E-mail é obrigatório';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'E-mail inválido';
        
        if (formData.cpf && !validateCPF(formData.cpf)) newErrors.cpf = 'CPF inválido';
        
        if (formData.role === 'operator' && !formData.department_id) {
             // Optional: Force department for operators? User said "vincular esse operador ao departamento".
             // Assuming it's required for operators.
             newErrors.department_id = 'Departamento é obrigatório';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e?: React.FormEvent, skipPrompt = false) => {
        if (e) e.preventDefault();
        
        if (!validate()) {
            toast.error('Verifique os erros no formulário.');
            return;
        }

        // Prompt if creating a new operator without restrictions
        if (!initialData && !skipPrompt && formData.role === 'operator' && formData.restricted_company_ids.length === 0) {
            setShowRestrictionPrompt(true);
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                name: formData.name,
                email: formData.email,
                cpf: formData.cpf.replace(/\D/g, ''),
                phone: formData.phone.replace(/\D/g, ''),
                department_id: formData.department_id,
                role: formData.role as 'admin' | 'operator',
                access_schedule_id: formData.access_schedule_id === 'none' ? undefined : formData.access_schedule_id,
                restricted_company_ids: formData.restricted_company_ids,
            };

            let res;
            if (initialData) {
                res = await updateTeamUser(initialData.id, payload);
            } else {
                res = await createTeamUser(payload);
            }

            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(initialData ? 'Membro atualizado com sucesso!' : 'Membro adicionado com sucesso!');
                onSuccess();
            }
        } catch (error) {
            toast.error('Ocorreu um erro ao salvar.');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">
                    {initialData ? 'Editar Membro' : 'Novo Membro'}
                </h2>
                <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl bg-white p-6 rounded-lg border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            disabled={isLoading}
                            className={errors.name ? 'border-red-500' : ''}
                        />
                        {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            disabled={isLoading}
                            className={errors.email ? 'border-red-500' : ''}
                        />
                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cpf">CPF</Label>
                        <Input
                            id="cpf"
                            value={formData.cpf}
                            onChange={(e) => handleChange('cpf', e.target.value)}
                            disabled={isLoading}
                            maxLength={14}
                            className={errors.cpf ? 'border-red-500' : ''}
                        />
                        {errors.cpf && <p className="text-xs text-red-500">{errors.cpf}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Celular</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            disabled={isLoading}
                            maxLength={15}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Tipo de Acesso</Label>
                        <Select
                            value={formData.role}
                            onValueChange={(val) => handleChange('role', val)}
                            disabled={isLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="operator">Operador</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="department_id">Departamento</Label>
                        <Select
                            value={formData.department_id}
                            onValueChange={(val) => handleChange('department_id', val)}
                            disabled={isLoading || formData.role === 'admin'}
                        >
                            <SelectTrigger className={errors.department_id ? 'border-red-500' : ''}>
                                <SelectValue placeholder="Selecione o Departamento" />
                            </SelectTrigger>
                            <SelectContent>
                                {departments.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.department_id && <p className="text-xs text-red-500">{errors.department_id}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="access_schedule_id">Tabela de Horário (Acesso)</Label>
                        <Select
                            value={formData.access_schedule_id || 'none'}
                            onValueChange={(val) => handleChange('access_schedule_id', val)}
                            disabled={isLoading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Sem restrição de horário" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sem restrição (Acesso total)</SelectItem>
                                {schedules.map((schedule) => (
                                    <SelectItem key={schedule.id} value={schedule.id}>
                                        {schedule.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.role === 'operator' && (
                        <div className="space-y-2">
                            <Label>Restrições de Acesso a Empresas (Opcional)</Label>
                            <div className="text-xs text-muted-foreground mb-2">
                                Selecione as empresas que este operador <strong>NÃO</strong> deve ter acesso. Se vazio, terá acesso a todas.
                            </div>
                            
                            <Popover open={openCompanies} onOpenChange={setOpenCompanies}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openCompanies}
                                        className="w-full justify-between"
                                        disabled={isLoading}
                                    >
                                        {formData.restricted_company_ids && formData.restricted_company_ids.length > 0
                                            ? `${formData.restricted_company_ids.length} empresa(s) restrita(s)`
                                            : "Nenhuma restrição (Acesso Total)"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                    <div className="flex flex-col">
                                        <div className="flex items-center border-b px-3">
                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                            <Input
                                                placeholder="Digite a Razão Social ou CNPJ..."
                                                value={searchCompany}
                                                onChange={(e) => setSearchCompany(e.target.value)}
                                                className="border-0 focus-visible:ring-0 shadow-none px-0"
                                            />
                                        </div>
                                        <ScrollArea className="h-[300px]">
                                            {(() => {
                                                const filteredCompanies = companies.filter(company => 
                                                    (company.razao_social && company.razao_social.toLowerCase().includes(searchCompany.toLowerCase())) ||
                                                    (company.nome && company.nome.toLowerCase().includes(searchCompany.toLowerCase())) || 
                                                    (company.cnpj && company.cnpj.includes(searchCompany))
                                                );

                                                if (filteredCompanies.length === 0) {
                                                    return (
                                                        <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-sm">
                                                            Nenhuma empresa encontrada.
                                                        </div>
                                                    );
                                                }

                                                return filteredCompanies.map((company) => {
                                                    const isSelected = (formData.restricted_company_ids || []).includes(company.id);
                                                    return (
                                                        <div
                                                            key={company.id}
                                                            className="flex items-center justify-between px-3 py-2 hover:bg-muted cursor-pointer"
                                                            onClick={() => {
                                                                setFormData(prev => {
                                                                    const current = prev.restricted_company_ids || [];
                                                                    const exists = current.includes(company.id);
                                                                    const newIds = exists
                                                                        ? current.filter(id => id !== company.id)
                                                                        : [...current, company.id];
                                                                    
                                                                    return {
                                                                        ...prev,
                                                                        restricted_company_ids: newIds
                                                                    };
                                                                });
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Check
                                                                    className={cn(
                                                                        "h-4 w-4",
                                                                        isSelected ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <div>
                                                                    <div className="font-medium text-sm">{company.razao_social || company.nome}</div>
                                                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                                                        <span>{company.cnpj}</span>
                                                                        {company.code && <span>Cód: {company.code}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </ScrollArea>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                </div>

                {formData.role === 'operator' && formData.restricted_company_ids && formData.restricted_company_ids.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                        <div className="flex items-center justify-between mb-4">
                            <Label className="text-base font-semibold">Empresas Restritas Selecionadas ({formData.restricted_company_ids.length})</Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-xs h-8 px-3"
                                onClick={() => setFormData(prev => ({ ...prev, restricted_company_ids: [] }))}
                            >
                                Limpar todas
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {formData.restricted_company_ids.map(id => {
                                const company = companies.find(c => c.id === id);
                                if (!company) return null;
                                return (
                                    <div key={id} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                                        <div className="flex flex-col overflow-hidden mr-2">
                                            <span className="text-sm font-medium truncate" title={company.razao_social || company.nome}>
                                                {company.razao_social || company.nome}
                                            </span>
                                            <div className="flex gap-2 text-xs text-muted-foreground">
                                                <span>{company.cnpj}</span>
                                                {company.code && <span>Cód: {company.code}</span>}
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    restricted_company_ids: (prev.restricted_company_ids || []).filter(cid => cid !== id)
                                                }));
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {initialData ? 'Salvar Alterações' : 'Cadastrar Membro'}
                    </Button>
                </div>
            </form>

            <AlertDialog open={showRestrictionPrompt} onOpenChange={setShowRestrictionPrompt}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Acesso Total a Empresas</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você está prestes a criar um operador <strong>sem nenhuma restrição de empresa</strong>. 
                            Isso significa que este operador terá acesso a <strong>todas</strong> as empresas do sistema.
                            <br /><br />
                            Deseja continuar com o acesso total ou voltar para selecionar restrições?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar para restringir</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleSubmit(undefined, true)}>
                            Continuar com Acesso Total
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
