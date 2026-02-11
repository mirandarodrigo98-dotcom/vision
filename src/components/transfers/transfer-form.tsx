'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTransfer, updateTransfer } from '@/app/actions/transfers';
import { getEmployeesByCompany } from '@/app/actions/employees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface TransferFormProps {
    companies: Array<{ id: string; nome: string; cnpj: string }>;
    activeCompanyId?: string | null;
    initialData?: any;
    isEditing?: boolean;
    redirectPath?: string;
    readOnly?: boolean;
}

const parseDate = (dateStr: string) => {
    if (!dateStr) return undefined;
    const cleanDate = dateStr.trim().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        const [y, m, d] = cleanDate.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
};

export function TransferForm({ companies, activeCompanyId, initialData, isEditing = false, redirectPath = '/app/transfers', readOnly = false }: TransferFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState<Date | undefined>(
        initialData?.transfer_date ? parseDate(initialData.transfer_date) : undefined
    );
    const [sourceCompanyId, setSourceCompanyId] = useState<string>(initialData?.source_company_id || activeCompanyId || '');
    const [employees, setEmployees] = useState<Array<{id: string, name: string}>>([]);
    const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>(initialData?.employee_name || '');
    const [targetCompanyId, setTargetCompanyId] = useState<string>(initialData?.target_company_id || '');

    useEffect(() => {
        if (sourceCompanyId) {
            getEmployeesByCompany(sourceCompanyId).then(setEmployees);
            // Reset employee selection if source company changes and it's not the initial load matching initialData
            if (sourceCompanyId !== initialData?.source_company_id) {
                setSelectedEmployeeName('');
            }
        } else {
            setEmployees([]);
            setSelectedEmployeeName('');
        }
    }, [sourceCompanyId, initialData?.source_company_id]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        if (date) {
            formData.set('transfer_date', format(date, 'yyyy-MM-dd'));
        } else {
             toast.error('Data da transferência é obrigatória');
             setLoading(false);
             return;
        }

        try {
            let result;
            if (isEditing && initialData?.id) {
                result = await updateTransfer(initialData.id, formData);
            } else {
                result = await createTransfer(formData);
            }

            if (result.success) {
                toast.success(isEditing ? 'Transferência atualizada!' : 'Solicitação de transferência criada!');
                router.push(redirectPath);
                router.refresh();
            } else {
                toast.error(result.error || 'Erro ao salvar transferência');
            }
        } catch (error) {
            toast.error('Erro inesperado');
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>{readOnly ? 'Visualizar Transferência' : (isEditing ? 'Retificar Transferência' : 'Nova Solicitação de Transferência')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset disabled={readOnly} className="space-y-6 border-none p-0 m-0 group-disabled:opacity-100">
                    {/* Hidden Source Company ID */}
                    <input type="hidden" name="source_company_id" value={initialData?.source_company_id || activeCompanyId || ''} />

                    {/* Employee Name */}
                    <div className="space-y-2">
                        <Label htmlFor="employee_name">Funcionário Origem *</Label>
                         {isEditing ? (
                             <Input 
                                value={initialData.employee_name} 
                                disabled 
                             />
                         ) : (
                            <Select 
                                name="employee_name" 
                                required 
                                value={selectedEmployeeName}
                                onValueChange={setSelectedEmployeeName}
                                disabled={!sourceCompanyId}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={sourceCompanyId ? "Selecione o funcionário" : "Selecione a empresa de origem primeiro"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(employee => (
                                        <SelectItem key={employee.id} value={employee.name}>
                                            {employee.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                         )}
                         {isEditing && <input type="hidden" name="employee_name" value={initialData.employee_name} />}
                    </div>

                    {/* Target Company */}
                    <div className="space-y-2">
                        <Label htmlFor="target_company_id">Empresa Destino *</Label>
                         {isEditing ? (
                             <Input 
                                value={companies.find(c => c.id === initialData.target_company_id)?.nome || initialData.target_company_name || 'Empresa desconhecida'} 
                                disabled 
                             />
                         ) : (
                            <Select 
                                name="target_company_id" 
                                required 
                                defaultValue={initialData?.target_company_id}
                                disabled={!sourceCompanyId}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={sourceCompanyId ? "Selecione a empresa de destino" : "Selecione a origem primeiro"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies
                                        .filter(c => c.id !== sourceCompanyId)
                                        .map(company => (
                                        <SelectItem key={company.id} value={company.id}>
                                            {company.nome} ({company.cnpj})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                         )}
                         {isEditing && <input type="hidden" name="target_company_id" value={initialData.target_company_id} />}
                    </div>

                    {/* Transfer Date */}
                    <div className="space-y-2 flex flex-col">
                        <Label>Data da Transferência *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                    locale={ptBR}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Observations */}
                    <div className="space-y-2">
                        <Label htmlFor="observations">Observações</Label>
                        <Textarea 
                            id="observations" 
                            name="observations" 
                            defaultValue={initialData?.observations} 
                            placeholder="Observações adicionais (opcional)"
                        />
                    </div>

                    </fieldset>

                    {!readOnly && (
                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Enviar Solicitação')}
                            </Button>
                        </div>
                    )}

                    {readOnly && (
                         <div className="flex justify-end pt-4">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => router.back()}
                            >
                                Voltar
                            </Button>
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    );
}
