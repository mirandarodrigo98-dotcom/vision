'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { createTeamUser, updateTeamUser, TeamUser } from '@/app/actions/team';
import { Department } from '@/app/actions/departments';
import { validateCPF } from '@/lib/validators';

interface TeamFormProps {
    departments: Department[];
    initialData?: TeamUser;
    onCancel: () => void;
    onSuccess: () => void;
}

export default function TeamForm({ departments, initialData, onCancel, onSuccess }: TeamFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        email: initialData?.email || '',
        cpf: initialData?.cpf || '',
        phone: initialData?.phone || '',
        department_id: initialData?.department_id || '',
        role: initialData?.role || 'operator',
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validate()) {
            toast.error('Verifique os erros no formulário.');
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
                </div>

                <div className="pt-4 flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {initialData ? 'Salvar Alterações' : 'Cadastrar Membro'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
