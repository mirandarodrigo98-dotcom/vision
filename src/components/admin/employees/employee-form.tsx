'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createEmployee, updateEmployee } from '@/app/actions/employees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Employee {
  id: string;
  company_id: string;
  code?: string | null;
  name: string;
  admission_date?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  pis?: string | null;
  cpf?: string | null;
  esocial_registration?: string | null;
}

interface EmployeeFormProps {
    companies: Array<{ id: string; nome: string; cnpj: string }>;
    initialData?: Employee;
    readOnly?: boolean;
}

export function EmployeeForm({ companies, initialData, readOnly }: EmployeeFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [admissionDate, setAdmissionDate] = useState<Date | undefined>(
        initialData?.admission_date ? new Date(initialData.admission_date) : undefined
    );
    const [birthDate, setBirthDate] = useState<Date | undefined>(
        initialData?.birth_date ? new Date(initialData.birth_date) : undefined
    );

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        if (!admissionDate) {
            toast.error('Data de admissão é obrigatória');
            setLoading(false);
            return;
        }
        if (!birthDate) {
            toast.error('Data de nascimento é obrigatória');
            setLoading(false);
            return;
        }

        const formData = new FormData(event.currentTarget);
        
        formData.set('admission_date', admissionDate.toISOString());
        formData.set('birth_date', birthDate.toISOString());

        try {
            const result = initialData 
                ? await updateEmployee(initialData.id, formData)
                : await createEmployee(formData);

            if (result.error) {
                toast.error(result.error);
                if (result.details) {
                    console.error(result.details);
                }
            } else {
                toast.success(`Funcionário ${initialData ? 'atualizado' : 'criado'} com sucesso!`);
                router.push('/admin/employees');
                router.refresh();
            }
        } catch (error) {
            toast.error('Ocorreu um erro ao salvar.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    {readOnly 
                        ? 'Visualizar Funcionário' 
                        : (initialData ? 'Editar Funcionário' : 'Dados do Funcionário')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <fieldset disabled={readOnly} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="company_id">Empresa *</Label>
                            <Select name="company_id" required defaultValue={initialData?.company_id}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a empresa" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map(company => (
                                        <SelectItem key={company.id} value={company.id}>
                                            {company.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="code">Código *</Label>
                            <Input 
                                id="code" 
                                name="code" 
                                type="number" 
                                required
                                placeholder="Código do funcionário" 
                                defaultValue={initialData?.code || ''} 
                                min="1"
                                step="1"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="name">Nome Completo *</Label>
                            <Input id="name" name="name" required placeholder="Nome do funcionário" defaultValue={initialData?.name || ''} />
                        </div>

                        <div className="space-y-2">
                            <Label>Data de Admissão *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !admissionDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {admissionDate ? format(admissionDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione a data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={admissionDate}
                                        onSelect={setAdmissionDate}
                                        initialFocus
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Data de Nascimento *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !birthDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {birthDate ? format(birthDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione a data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={birthDate}
                                        onSelect={setBirthDate}
                                        initialFocus
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="gender">Sexo *</Label>
                            <Select name="gender" required defaultValue={initialData?.gender || undefined}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o sexo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="M">Masculino</SelectItem>
                                    <SelectItem value="F">Feminino</SelectItem>
                                    <SelectItem value="O">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pis">PIS</Label>
                            <Input id="pis" name="pis" placeholder="000.00000.00-0" defaultValue={initialData?.pis || ''} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="cpf">CPF *</Label>
                            <Input id="cpf" name="cpf" required placeholder="000.000.000-00" defaultValue={initialData?.cpf || ''} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="esocial_registration">e-Social *</Label>
                            <Input id="esocial_registration" name="esocial_registration" required placeholder="Matrícula e-Social" defaultValue={initialData?.esocial_registration || ''} />
                        </div>
                    </div>
                </fieldset>

                    <div className="flex justify-end gap-4 pt-4">
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            {readOnly ? 'Voltar' : 'Cancelar'}
                        </Button>
                        {!readOnly && (
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Salvando...' : (initialData ? 'Atualizar Funcionário' : 'Salvar Funcionário')}
                            </Button>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
