'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, ArrowLeft, Check, ChevronsUpDown, X } from 'lucide-react';
import { createTeamUser, updateTeamUser, TeamUser } from '@/app/actions/team';
import { Department } from '@/app/actions/departments';
import { AccessSchedule } from '@/types/access-schedule';
import { validateCPF } from '@/lib/validators';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
                                    <Command>
                                        <CommandInput placeholder="Buscar empresa..." />
                                        <CommandList>
                                            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                                            <CommandGroup>
                                                    {companies.map((company) => (
                                                        <CommandItem
                                                            key={company.id}
                                                            value={company.nome}
                                                            onSelect={() => {
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
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    (formData.restricted_company_ids || []).includes(company.id) ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col">
                                                                <span>{company.nome}</span>
                                                                <span className="text-xs text-muted-foreground">{company.cnpj}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>

                            {formData.restricted_company_ids && formData.restricted_company_ids.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.restricted_company_ids.map(id => {
                                        const company = companies.find(c => c.id === id);
                                        if (!company) return null;
                                        return (
                                            <Badge key={id} variant="secondary" className="flex items-center gap-1">
                                                {company.nome}
                                                <button
                                                    type="button"
                                                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            restricted_company_ids: (prev.restricted_company_ids || []).filter(cid => cid !== id)
                                                        }));
                                                    }}
                                                >
                                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                                </button>
                                            </Badge>
                                        );
                                    })}
                                    {formData.restricted_company_ids.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs h-6 px-2"
                                            onClick={() => setFormData(prev => ({ ...prev, restricted_company_ids: [] }))}
                                        >
                                            Limpar tudo
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

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
