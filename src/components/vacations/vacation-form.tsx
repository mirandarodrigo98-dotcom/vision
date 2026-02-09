'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createVacation, updateVacation } from '@/app/actions/vacations';
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { calculateReturnDate } from '@/lib/holidays';

interface VacationFormProps {
    companies: Array<{ id: string; nome: string; cnpj: string }>;
    activeCompanyId?: string | null;
    initialData?: any;
    isEditing?: boolean;
    redirectPath?: string;
    readOnly?: boolean;
}

export function VacationForm({ companies, activeCompanyId, initialData, isEditing = false, redirectPath = '/admin/vacations', readOnly = false }: VacationFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    
    // Form States
    const [companyId, setCompanyId] = useState<string>(initialData?.company_id || activeCompanyId || '');
    const [employeeId, setEmployeeId] = useState<string>(initialData?.employee_id || '');
    const [employees, setEmployees] = useState<Array<{id: string, name: string}>>([]);
    
    const [startDate, setStartDate] = useState<Date | undefined>(
        initialData?.start_date ? new Date(initialData.start_date) : undefined
    );
    const [daysQuantity, setDaysQuantity] = useState<string>(initialData?.days_quantity?.toString() || '');
    const [allowanceDays, setAllowanceDays] = useState<string>(initialData?.allowance_days?.toString() || '');
    const [returnDate, setReturnDate] = useState<Date | undefined>(
        initialData?.return_date ? new Date(initialData.return_date) : undefined
    );

    // Fetch employees when company changes
    useEffect(() => {
        if (companyId) {
            getEmployeesByCompany(companyId).then(setEmployees);
            // Reset employee selection if company changes
            if (companyId !== initialData?.company_id) {
                setEmployeeId('');
            }
        } else {
            setEmployees([]);
            setEmployeeId('');
        }
    }, [companyId, initialData?.company_id]);

    // Calculate Return Date when Start Date or Days Quantity changes
    useEffect(() => {
        if (startDate && daysQuantity && !isNaN(parseInt(daysQuantity))) {
            const calculated = calculateReturnDate(
                format(startDate, 'yyyy-MM-dd'), 
                parseInt(daysQuantity)
            );
            setReturnDate(calculated);
        } else {
            setReturnDate(undefined);
        }
    }, [startDate, daysQuantity]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        
        if (startDate) {
            formData.set('start_date', format(startDate, 'yyyy-MM-dd'));
        } else {
             toast.error('Data Inicial das Férias é obrigatória');
             setLoading(false);
             return;
        }

        try {
            let result;
            if (isEditing && initialData?.id) {
                result = await updateVacation(initialData.id, formData);
            } else {
                result = await createVacation(formData);
            }

            if (result.success) {
                toast.success(isEditing ? 'Férias atualizadas!' : 'Solicitação de férias criada!');
                router.push(redirectPath);
                router.refresh();
            } else {
                toast.error(result.error || 'Erro ao salvar férias');
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
                <CardTitle>{readOnly ? 'Visualizar Férias' : (isEditing ? 'Editar Férias' : 'Nova Solicitação de Férias')}</CardTitle>
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
                        {/* Data Inicial */}
                        <div className="space-y-2 flex flex-col">
                            <Label>Data Inicial das Férias *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        onSelect={setStartDate}
                                        initialFocus
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Dias de Férias */}
                        <div className="space-y-2">
                            <Label htmlFor="days_quantity">Dias de Férias *</Label>
                            <Input 
                                id="days_quantity"
                                name="days_quantity"
                                type="number" 
                                min="1" 
                                max="30"
                                required 
                                value={daysQuantity}
                                onChange={(e) => setDaysQuantity(e.target.value)}
                                placeholder="Ex: 30"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Dias de Abono */}
                        <div className="space-y-2">
                            <Label htmlFor="allowance_days">Dias de Abono</Label>
                            <Input 
                                id="allowance_days"
                                name="allowance_days"
                                type="number" 
                                min="0" 
                                max="10"
                                value={allowanceDays}
                                onChange={(e) => setAllowanceDays(e.target.value)}
                                placeholder="Ex: 10"
                            />
                        </div>

                        {/* Data Retorno (Calculada) */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground">Data Retorno Férias (Calculada)</Label>
                            <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted text-muted-foreground text-sm flex items-center">
                                {returnDate ? format(returnDate, "dd/MM/yyyy", { locale: ptBR }) : '-'}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                * Considera feriados nacionais e dias úteis.
                            </p>
                        </div>
                    </div>

                    {/* Observações */}
                    <div className="space-y-2">
                        <Label htmlFor="observations">Observações</Label>
                        <Textarea 
                            id="observations"
                            name="observations" 
                            defaultValue={initialData?.observations}
                            placeholder="Observações adicionais..."
                            className="min-h-[100px]"
                        />
                    </div>

                    </fieldset>

                    {!readOnly && (
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
