'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createDismissal, updateDismissal } from '@/app/actions/dismissals';
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
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DismissalFormProps {
    companies: Array<{ id: string; nome: string; cnpj: string }>;
    activeCompanyId?: string | null;
    initialData?: any;
    isEditing?: boolean;
    readOnly?: boolean;
    redirectPath?: string;
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

export function DismissalForm({ companies, activeCompanyId, initialData, isEditing = false, readOnly = false, redirectPath = '/admin/dismissals' }: DismissalFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    
    // Form States
    const [companyId, setCompanyId] = useState<string>(initialData?.company_id || activeCompanyId || '');
    const [employeeId, setEmployeeId] = useState<string>(initialData?.employee_id || '');
    const [employees, setEmployees] = useState<Array<{id: string, name: string}>>([]);
    
    // Controlled Selects
    const [noticeType, setNoticeType] = useState<string>(initialData?.notice_type || '');
    const [dismissalCause, setDismissalCause] = useState<string>(initialData?.dismissal_cause || '');
    
    const [dismissalDate, setDismissalDate] = useState<Date | undefined>(
        initialData?.dismissal_date ? parseDate(initialData.dismissal_date) : undefined
    );

    // Fetch employees when company changes
    useEffect(() => {
        if (companyId) {
            getEmployeesByCompany(companyId).then(setEmployees);
            if (companyId !== initialData?.company_id) {
                setEmployeeId('');
            }
        } else {
            setEmployees([]);
            setEmployeeId('');
        }
    }, [companyId, initialData?.company_id]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        
        if (dismissalDate) {
            formData.set('dismissal_date', format(dismissalDate, 'yyyy-MM-dd'));
        } else {
             toast.error('Data de Desligamento é obrigatória');
             setLoading(false);
             return;
        }

        try {
            let result;
            if (isEditing && initialData?.id) {
                result = await updateDismissal(initialData.id, formData);
            } else {
                result = await createDismissal(formData);
            }

            if (result.success) {
                toast.success(isEditing ? 'Rescisão atualizada!' : 'Solicitação de rescisão criada!');
                router.push(redirectPath);
                router.refresh();
            } else {
                toast.error(result.error || 'Erro ao salvar rescisão');
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
                <CardTitle>{readOnly ? 'Visualizar Rescisão' : (isEditing ? 'Editar Rescisão' : 'Nova Solicitação de Rescisão')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset disabled={readOnly} className="space-y-6 border-none p-0 m-0 group-disabled:opacity-100">
                    {/* Hidden Company ID */}
                    <input type="hidden" name="company_id" value={initialData?.company_id || activeCompanyId || ''} />

                    {/* Funcionário */}
                    <div className="space-y-2">
                        <Label htmlFor="employee_id">Funcionário *</Label>
                         {isEditing ? (
                             <Input 
                                value={initialData.employee_name} 
                                disabled 
                             />
                         ) : (
                            <>
                                <input type="hidden" name="employee_id" value={employeeId} />
                                <Select 
                                    value={employeeId}
                                    onValueChange={setEmployeeId}
                                    disabled={!companyId}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={companyId ? "Selecione o funcionário" : "Selecione a empresa primeiro"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(employee => (
                                            <SelectItem key={employee.id} value={employee.id}>
                                                {employee.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </>
                         )}
                         {isEditing && <input type="hidden" name="employee_id" value={initialData.employee_id} />}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tipo de Aviso */}
                        <div className="space-y-2">
                            <Label htmlFor="notice_type">Tipo de Aviso *</Label>
                            <input type="hidden" name="notice_type" value={noticeType} />
                            <Select value={noticeType} onValueChange={setNoticeType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Trabalhado">Trabalhado</SelectItem>
                                    <SelectItem value="Indenizado">Indenizado</SelectItem>
                                    <SelectItem value="Fim de Contrato">Fim de Contrato</SelectItem>
                                    <SelectItem value="Quebra de Contrato">Quebra de Contrato</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Causa Demissão */}
                        <div className="space-y-2">
                            <Label htmlFor="dismissal_cause">Causa Demissão *</Label>
                            <input type="hidden" name="dismissal_cause" value={dismissalCause} />
                            <Select value={dismissalCause} onValueChange={setDismissalCause}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a causa" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Sem Justa Causa">Sem Justa Causa</SelectItem>
                                    <SelectItem value="Com Justa Causa">Com Justa Causa</SelectItem>
                                    <SelectItem value="Fim de Contrato">Fim de Contrato</SelectItem>
                                    <SelectItem value="Fim Antecipado C.T. Empregado">Fim Antecipado C.T. Empregado</SelectItem>
                                    <SelectItem value="Fim Antecipado C.T. Empresa">Fim Antecipado C.T. Empresa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Data de Desligamento */}
                    <div className="space-y-2 flex flex-col">
                        <Label>Data de Desligamento *</Label>
                        <DatePicker
                            date={dismissalDate}
                            setDate={setDismissalDate}
                            disabled={readOnly}
                            placeholder="Selecione uma data"
                        />
                    </div>

                    {/* Observações */}
                    <div className="space-y-2">
                        <Label htmlFor="observations">Observações</Label>
                        <Textarea 
                            id="observations" 
                            name="observations" 
                            placeholder="Informações adicionais..." 
                            className="min-h-[100px]"
                            defaultValue={initialData?.observations}
                        />
                    </div>
                    </fieldset>

                    <div className="flex justify-end gap-4 pt-4">
                        <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => router.back()}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? 'Salvar Alterações' : 'Enviar Solicitação'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
