'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createAdmission, updateAdmission } from '@/app/actions/admissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Verified import
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Copy, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TimePicker } from "@/components/ui/time-picker";

interface AdmissionFormProps {
    companies: Array<{ id: string; nome: string; cnpj: string }>;
    initialData?: any;
    isEditing?: boolean;
    isAdmin?: boolean;
}

const DEFAULT_SCHEDULE = [
    { day: 'Domingo', active: false, isDSR: false, isFolga: false, isCPS: false, start: '', breakStart: '', breakEnd: '', end: '' },
    { day: 'Segunda-feira', active: false, isDSR: false, isFolga: false, isCPS: false, start: '', breakStart: '', breakEnd: '', end: '' },
    { day: 'Terça-feira', active: false, isDSR: false, isFolga: false, isCPS: false, start: '', breakStart: '', breakEnd: '', end: '' },
    { day: 'Quarta-feira', active: false, isDSR: false, isFolga: false, isCPS: false, start: '', breakStart: '', breakEnd: '', end: '' },
    { day: 'Quinta-feira', active: false, isDSR: false, isFolga: false, isCPS: false, start: '', breakStart: '', breakEnd: '', end: '' },
    { day: 'Sexta-feira', active: false, isDSR: false, isFolga: false, isCPS: false, start: '', breakStart: '', breakEnd: '', end: '' },
    { day: 'Sábado', active: false, isDSR: false, isFolga: false, isCPS: false, start: '', breakStart: '', breakEnd: '', end: '' },
];

export function AdmissionForm({ companies, initialData, isEditing = false, isAdmin = false }: AdmissionFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // State initialization with initialData support
    const [hasVt, setHasVt] = useState(!!initialData?.has_vt);
    const [hasAdv, setHasAdv] = useState(!!initialData?.has_adv);
    const [trialPeriod, setTrialPeriod] = useState(
        initialData ? `${initialData.trial1_days}+${initialData.trial2_days}` : '30+30'
    );
    const [date, setDate] = useState<Date | undefined>(
        initialData?.admission_date ? new Date(initialData.admission_date) : undefined
    );
    
    // File handling
    const [fileName, setFileName] = useState(isEditing ? 'Arquivo atual mantido (selecione para alterar)' : '');
    const [fileError, setFileError] = useState<string | null>(null);
    
    // Money fields
    const [salaryDisplay, setSalaryDisplay] = useState(
        initialData?.salary_cents 
            ? (initialData.salary_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : ''
    );
    const [vtTarifaDisplay, setVtTarifaDisplay] = useState(
        initialData?.vt_tarifa_cents
            ? (initialData.vt_tarifa_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : ''
    );

    // Schedule handling
    const [schedule, setSchedule] = useState(() => {
        if (initialData?.work_schedule) {
            try {
                const parsed = typeof initialData.work_schedule === 'string' 
                    ? JSON.parse(initialData.work_schedule) 
                    : initialData.work_schedule;
                    
                return DEFAULT_SCHEDULE.map(day => {
                    const found = Array.isArray(parsed) ? parsed.find((p: any) => p.day === day.day) : null;
                    if (found) {
                        const isActive = found.active !== undefined ? found.active : true;
                        return { ...day, ...found, active: isActive };
                    }
                    return day;
                });
            } catch (e) {
                console.error('Error parsing schedule', e);
                return DEFAULT_SCHEDULE;
            }
        }
        return DEFAULT_SCHEDULE;
    });

    const handleActiveChange = (index: number, checked: boolean) => {
        const newSchedule = [...schedule];
        newSchedule[index].active = checked;
        if (checked) {
            newSchedule[index].isDSR = false;
            newSchedule[index].isFolga = false;
            newSchedule[index].isCPS = false;
        } else {
             newSchedule[index].start = '';
             newSchedule[index].breakStart = '';
             newSchedule[index].breakEnd = '';
             newSchedule[index].end = '';
        }
        setSchedule(newSchedule);
    };

    const handleDSRChange = (index: number, checked: boolean) => {
        const newSchedule = schedule.map((day, i) => {
            if (i === index) {
                return { 
                    ...day, 
                    isDSR: checked, 
                    active: false, 
                    isFolga: false,
                    isCPS: false,
                    start: '', breakStart: '', breakEnd: '', end: '' 
                };
            }
            // Uncheck DSR for all other days if this one is checked
            if (checked) {
                return { ...day, isDSR: false };
            }
            return day;
        });
        setSchedule(newSchedule);
    };

    const handleFolgaChange = (index: number, checked: boolean) => {
        const newSchedule = [...schedule];
        newSchedule[index].isFolga = checked;
        if (checked) {
            newSchedule[index].active = false;
            newSchedule[index].isDSR = false;
            newSchedule[index].isCPS = false;
            newSchedule[index].start = '';
            newSchedule[index].breakStart = '';
            newSchedule[index].breakEnd = '';
            newSchedule[index].end = '';
        }
        setSchedule(newSchedule);
    };

    const handleCPSChange = (index: number, checked: boolean) => {
        const newSchedule = schedule.map((day, i) => {
            if (i === index) {
                return { 
                    ...day, 
                    isCPS: checked, 
                    active: false, 
                    isDSR: false,
                    isFolga: false,
                    start: '', breakStart: '', breakEnd: '', end: '' 
                };
            }
            // Uncheck CPS for all other days if this one is checked
            if (checked) {
                return { ...day, isCPS: false };
            }
            return day;
        });
        setSchedule(newSchedule);
    };

    const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        const cents = parseInt(value, 10);
        if (!value || isNaN(cents)) {
            setSalaryDisplay('');
            return;
        }
        const floatVal = cents / 100;
        setSalaryDisplay(floatVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    };
    
    // Re-implemented handleVtTarifaChange since it wasn't in the original snippet but needed for the controlled input if we want one
    // But original code didn't show the handler for vt_tarifa_brl, it just showed the input. 
    // Wait, the original code had:
    /*
    <Input 
        id="vt_tarifa_brl" 
        name="vt_tarifa_brl" 
        type="number" 
        step="0.01" 
        placeholder="0,00"
        required={hasVt} 
    />
    */
    // It was using native number input. But for BRL formatting (comma), text input with masking is better.
    // The memory says: "Numeric currency fields like 'Tarifa' use a custom mask for BRL formatting".
    // So I should implement it similar to salary.
    
    const handleVtTarifaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        const cents = parseInt(value, 10);
        if (!value || isNaN(cents)) {
            setVtTarifaDisplay('');
            return;
        }
        const floatVal = cents / 100;
        setVtTarifaDisplay(floatVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    };

    const calculateMinutes = (time: string) => {
        if (!time) return 0;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const calculateDailyMinutes = (day: typeof schedule[0]) => {
        if (!day.active) return 0;
        let m1 = 0;
        if (day.start && day.breakStart) {
            const start = calculateMinutes(day.start);
            const end = calculateMinutes(day.breakStart);
            if (end > start) m1 = end - start;
        }
        let m2 = 0;
        if (day.breakEnd && day.end) {
            const start = calculateMinutes(day.breakEnd);
            const end = calculateMinutes(day.end);
            if (end > start) m2 = end - start;
        }
        return m1 + m2;
    };

    const formatMinutes = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}:${m.toString().padStart(2, '0')}`;
    };

    const totalWeeklyMinutes = schedule.reduce((acc, day) => acc + calculateDailyMinutes(day), 0);

    const handleReplicateSchedule = (sourceIndex: number) => {
        const sourceDay = schedule[sourceIndex];
        const newSchedule = schedule.map((day) => {
            if (day.active && day.day !== sourceDay.day) {
                return {
                    ...day,
                    start: sourceDay.start,
                    breakStart: sourceDay.breakStart,
                    breakEnd: sourceDay.breakEnd,
                    end: sourceDay.end,
                };
            }
            return day;
        });
        setSchedule(newSchedule);
        toast.success(`Horários de ${sourceDay.day} replicados para os demais dias habilitados.`);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setFileError(null);

        const form = e.currentTarget;
        if (!form.checkValidity() || !date) {
            setError('Você precisa preencher todos os campos obrigatórios');
            return;
        }

        // Validate Schedule
        const activeDays = schedule.filter(d => d.active);
        if (activeDays.length === 0) {
            setError('Selecione pelo menos um dia de trabalho.');
            return;
        }

        const invalidSchedule = schedule.find(day => day.active && (!day.start || !day.breakStart || !day.breakEnd || !day.end));
        if (invalidSchedule) {
            setError('Dia da semana selecionado sem valores definidos. Informe valores ou desabilite o campo.');
            return;
        }

        setLoading(true);

        const formData = new FormData(e.currentTarget);

        // Check file size again before submission
        const file = formData.get('file') as File;
        if (file && file.size > 0) {
             if (file.size > 50 * 1024 * 1024) { // 50MB
                setFileError('O arquivo excede o limite máximo de 50MB.');
                setLoading(false);
                return;
            }
        } else if (!isEditing) {
             // File is mandatory for new admissions
             setFileError('Arquivo obrigatório.');
             setLoading(false);
             return;
        }
        
        // Handle trial period
        const [trial1, trial2] = trialPeriod.split('+').map(Number);
        formData.set('trial1_days', trial1.toString());
        formData.set('trial2_days', trial2.toString());

        // Handle checkboxes (manually set because unchecked checkboxes are not sent)
        formData.set('has_vt', hasVt.toString());
        formData.set('has_adv', hasAdv.toString());

        try {
            let result: any;
            if (isEditing) {
                formData.append('admission_id', initialData.id);
                result = await updateAdmission(formData);
            } else {
                result = await createAdmission(formData);
            }
            
            if (result.error) {
                setError(result.error);
                setLoading(false);
            } else {
                if (result.r2Success === false || result.emailSuccess === false) {
                     // Warning logic
                     toast.warning(isEditing ? 'Admissão atualizada com avisos.' : 'Admissão salva com avisos.');
                } else {
                    toast.success(isEditing ? 'Admissão atualizada com sucesso!' : `Admissão criada com sucesso! Protocolo: ${result.protocolNumber}`);
                }
                
                if (isAdmin) {
                    router.push('/admin/admissions');
                } else {
                    router.push('/app/admissions');
                }
                router.refresh();
            }
        } catch (error: any) {
            console.error('Submission error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            toast.error(`Erro ao enviar formulário: ${errorMessage}`);
            setError(`Ocorreu um erro ao enviar: ${errorMessage}.`);
            setLoading(false);
        }
    };

    return (
        <TooltipProvider>
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {isEditing && (
                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 mt-0.5" />
                        <div>
                            <p className="font-bold">Modo de Retificação</p>
                            <p className="text-sm">Você está editando uma admissão existente. O nome do funcionário não pode ser alterado. Para alterar o nome, cancele esta admissão e crie uma nova.</p>
                        </div>
                    </div>
                )}
            
                <Card>
                <CardHeader>
                    <CardTitle>Dados da Empresa e Funcionário</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Empresa (Primeiro campo) */}
                    <div className="space-y-2">
                        <Label htmlFor="company_id">Empresa <span className="text-red-500">*</span></Label>
                        <Select name="company_id" required defaultValue={initialData?.company_id}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione a empresa..." />
                            </SelectTrigger>
                            <SelectContent>
                                {companies.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="employee_full_name">Nome Completo <span className="text-red-500">*</span></Label>
                        <Input 
                            id="employee_full_name" 
                            name="employee_full_name" 
                            required 
                            defaultValue={initialData?.employee_full_name}
                            readOnly={isEditing}
                            className={isEditing ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}
                            onInput={(e) => e.currentTarget.value = e.currentTarget.value.toUpperCase()}
                        />
                        {isEditing && <p className="text-xs text-gray-500">O nome não pode ser alterado em retificações.</p>}
                    </div>
                    
                    {/* Other fields with defaultValue */}
                    <div className="space-y-2">
                        <Label htmlFor="education_level">Grau de Instrução <span className="text-red-500">*</span></Label>
                        <Select name="education_level" required defaultValue={initialData?.education_level || "medio_completo"}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fundamental_incompleto">Fundamental Incompleto</SelectItem>
                                <SelectItem value="fundamental_completo">Fundamental Completo</SelectItem>
                                <SelectItem value="medio_incompleto">Médio Incompleto</SelectItem>
                                <SelectItem value="medio_completo">Médio Completo</SelectItem>
                                <SelectItem value="superior_incompleto">Superior Incompleto</SelectItem>
                                <SelectItem value="superior_completo">Superior Completo</SelectItem>
                                <SelectItem value="pos_graduacao">Pós-Graduação</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    {/* Fields for PDF (Hidden or Visible?) - Based on original form, they were not visible in the snippet I saw. 
                        Wait, the original file had `cpf`, `birth_date`, etc. in the createAdmission action, 
                        but I didn't see them in the truncated Read output of the JSX.
                        Let me assume they were there or should be there.
                        Actually, looking at `createAdmission` implementation, it extracts:
                        cpf, birth_date, mother_name, email, phone, marital_status, race_color, zip_code, etc.
                        
                        I should probably verify if they are in the full file.
                        The Read output was truncated at line 392.
                        I saw `employee_full_name`, `education_level`, `admission_date`, `job_role`, `salary_display`.
                        I did NOT see CPF, birth_date, etc. in the first 392 lines.
                        Wait, `createAdmission` reads them from formData.
                        If they are not in the JSX, `createAdmission` gets empty strings.
                        
                        Let's check if the original form had them.
                        I'll read the file again, focusing on the part I missed (between 237 and 286 maybe?).
                        Ah, I see lines 239-255 (Education), 257-284 (Date), 286-294 (Job Role), 296-307 (Salary).
                        
                        It seems the original form MIGHT NOT have had these fields visible in the snippet I read?
                        Or maybe they were added recently?
                        The `createAdmission` action has them.
                        If the form doesn't have them, then they are being sent as empty.
                        
                        Wait, if the user wants "retificar", they probably want to edit ALL data.
                        If the fields are missing in the UI, they can't edit them.
                        
                        Let me check the `AdmissionForm` content again.
                        I read up to line 631.
                        I see `CardContent` ending at 453.
                        Then `Card` "Benefícios e Adiantamentos" at 456.
                        Then "Observações Gerais" at 530.
                        Then "Documentação Obrigatória" at 547.
                        
                        It seems `cpf`, `birth_date`, etc. are MISSING from the `AdmissionForm` JSX I read!
                        This implies the current form in production DOES NOT collect this info?
                        But `createAdmission` tries to read them?
                        
                        "Extra fields for PDF" comment in `createAdmission` (line 56).
                        `const cpf = formData.get('cpf') as string || '';`
                        
                        If they are not in the form, they are empty.
                        Maybe the user uploads them in the ZIP file?
                        The checklist says "CPF", "Documento com foto", etc.
                        
                        Okay, if the fields are not in the current form, I should NOT add them now unless requested.
                        The request is "Retificar ... só não pode alterar o nome".
                        I should stick to the fields present in the form.
                        
                        However, I should double check if I missed any part of the file.
                        I read 1-392, then 393-631. It looks complete.
                        So the fields `cpf`, `birth_date`, etc. are indeed NOT in the form.
                        They might be intended for future use or I missed something very obvious.
                        
                        I will proceed with the fields that ARE in the form.
                    */}

                    <div className="space-y-2">
                        <Label htmlFor="admission_date">Data de Admissão <span className="text-red-500">*</span></Label>
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
                                    {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                    locale={ptBR}
                                    defaultMonth={date || new Date()}
                                />
                            </PopoverContent>
                        </Popover>
                        <input type="hidden" name="admission_date" value={date ? format(date, 'yyyy-MM-dd') : ''} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="job_role">Função / Cargo <span className="text-red-500">*</span></Label>
                        <Input 
                            id="job_role" 
                            name="job_role" 
                            required 
                            defaultValue={initialData?.job_role}
                            onInput={(e) => e.currentTarget.value = e.currentTarget.value.toUpperCase()}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="salary_display">Salário (R$) <span className="text-red-500">*</span></Label>
                        <Input 
                            id="salary_display" 
                            name="salary_display" 
                            value={salaryDisplay} 
                            onChange={handleSalaryChange}
                            placeholder="0,00" 
                            required 
                        />
                        <input type="hidden" name="salary_cents" value={salaryDisplay ? parseInt(salaryDisplay.replace(/\D/g, ''), 10) : ''} />
                    </div>

                    <div className="space-y-2">
                        <Label>Jornada de Trabalho <span className="text-red-500">*</span></Label>
                        <div className="rounded-md border overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-2 text-left">Dia da Semana</th>
                                        <th className="p-2 text-center w-16">Habilitar</th>
                                        <th className="p-2 text-center">Entrada</th>
                                        <th className="p-2 text-center">Saída Almoço</th>
                                        <th className="p-2 text-center">Volta Almoço</th>
                                        <th className="p-2 text-center">Saída</th>
                                        <th className="p-2 text-center">Total</th>
                                        <th className="p-2 text-center">Ações</th>
                                        <th className="p-2 text-center w-16">DSR</th>
                                        <th className="p-2 text-center w-16">Folga</th>
                                        <th className="p-2 text-center w-16">CPS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schedule.map((day, index) => (
                                        <tr key={day.day} className={`border-b ${day.active ? 'bg-white' : (day.isDSR ? 'bg-blue-50' : (day.isFolga ? 'bg-gray-50' : (day.isCPS ? 'bg-orange-50' : 'bg-gray-100')))}`}>
                                            <td className="p-2 font-medium">{day.day}</td>
                                            <td className="p-2 text-center">
                                                <Checkbox 
                                                    checked={day.active} 
                                                    onCheckedChange={(checked) => handleActiveChange(index, checked as boolean)}
                                                    disabled={day.isDSR || day.isFolga || day.isCPS}
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <TimePicker 
                                                    value={day.start} 
                                                    disabled={!day.active}
                                                    onChange={(val) => {
                                                        const newSchedule = [...schedule];
                                                        newSchedule[index].start = val;
                                                        setSchedule(newSchedule);
                                                    }}
                                                    className="w-24 text-center"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <TimePicker 
                                                    value={day.breakStart} 
                                                    disabled={!day.active}
                                                    onChange={(val) => {
                                                        const newSchedule = [...schedule];
                                                        newSchedule[index].breakStart = val;
                                                        setSchedule(newSchedule);
                                                    }}
                                                    className="w-24 text-center"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <TimePicker 
                                                    value={day.breakEnd} 
                                                    disabled={!day.active}
                                                    onChange={(val) => {
                                                        const newSchedule = [...schedule];
                                                        newSchedule[index].breakEnd = val;
                                                        setSchedule(newSchedule);
                                                    }}
                                                    className="w-24 text-center"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                <TimePicker 
                                                    value={day.end} 
                                                    disabled={!day.active}
                                                    onChange={(val) => {
                                                        const newSchedule = [...schedule];
                                                        newSchedule[index].end = val;
                                                        setSchedule(newSchedule);
                                                    }}
                                                    className="w-24 text-center"
                                                />
                                            </td>
                                            <td className="p-2 font-medium text-center">
                                                {formatMinutes(calculateDailyMinutes(day))}
                                            </td>
                                            <td className="p-2 text-center">
                                                {day.active ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleReplicateSchedule(index)}
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Replicar para os demais dias da semana que estiverem habilitados</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </td>
                                            <td className="p-2 text-center">
                                                <Button
                                                    type="button"
                                                    variant={day.isDSR ? "default" : "outline"}
                                                    size="sm"
                                                    className={day.isDSR ? "bg-blue-600 hover:bg-blue-700 h-8 text-[10px] px-1" : "h-8 text-[10px] px-1"}
                                                    onClick={() => handleDSRChange(index, !day.isDSR)}
                                                    disabled={day.active || day.isFolga || day.isCPS || (schedule.some(d => d.isDSR) && !day.isDSR)}
                                                    title="Descanso Semanal Remunerado"
                                                >
                                                    DSR
                                                </Button>
                                            </td>
                                            <td className="p-2 text-center">
                                                <Button
                                                    type="button"
                                                    variant={day.isFolga ? "default" : "outline"}
                                                    size="sm"
                                                    className={day.isFolga ? "bg-gray-600 hover:bg-gray-700 h-8 text-[10px] px-1" : "h-8 text-[10px] px-1"}
                                                    onClick={() => handleFolgaChange(index, !day.isFolga)}
                                                    disabled={day.active || day.isDSR || day.isCPS}
                                                    title="Folga Concedida"
                                                >
                                                    Folga
                                                </Button>
                                            </td>
                                            <td className="p-2 text-center">
                                                <Button
                                                    type="button"
                                                    variant={day.isCPS ? "default" : "outline"}
                                                    size="sm"
                                                    className={day.isCPS ? "bg-orange-600 hover:bg-orange-700 h-8 text-[10px] px-1" : "h-8 text-[10px] px-1"}
                                                    onClick={() => handleCPSChange(index, !day.isCPS)}
                                                    disabled={day.active || day.isDSR || day.isFolga || (schedule.some(d => d.isCPS) && !day.isCPS)}
                                                    title="Compensado"
                                                >
                                                    CPS
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50">
                                        <td colSpan={6} className="p-2 text-right font-bold">Total Semanal:</td>
                                        <td className="p-2 font-bold">{formatMinutes(totalWeeklyMinutes)}</td>
                                        <td colSpan={4}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <input type="hidden" name="work_schedule" value={JSON.stringify(schedule)} required />
                    </div>
                    
                    <div className="space-y-2">
                         <Label htmlFor="trial_period">Contrato de Experiência <span className="text-red-500">*</span></Label>
                         <Select value={trialPeriod} onValueChange={setTrialPeriod} name="trial_period">
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="30+30">30 + 30 dias</SelectItem>
                                <SelectItem value="45+45">45 + 45 dias</SelectItem>
                                <SelectItem value="30+60">30 + 60 dias</SelectItem>
                                <SelectItem value="60+30">60 + 30 dias</SelectItem>
                                <SelectItem value="90+0">90 dias (único)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Benefícios e Adiantamentos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Vale Transporte */}
                    <div className="space-y-4 border p-4 rounded-md">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="has_vt" checked={hasVt} onCheckedChange={(c) => setHasVt(!!c)} />
                            <Label htmlFor="has_vt" className="font-semibold">Vale Transporte</Label>
                        </div>
                        
                        {hasVt && (
                            <div className="space-y-4 pl-6">
                                <div className="space-y-2">
                                    <Label htmlFor="vt_tarifa_display">Tarifa (R$) <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="vt_tarifa_display" 
                                        name="vt_tarifa_display" 
                                        value={vtTarifaDisplay}
                                        onChange={handleVtTarifaChange}
                                        placeholder="0,00"
                                        required={hasVt} 
                                    />
                                    <input type="hidden" name="vt_tarifa_cents" value={vtTarifaDisplay ? parseInt(vtTarifaDisplay.replace(/\D/g, ''), 10) : ''} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vt_linha">Linha / Operadora <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="vt_linha" 
                                        name="vt_linha" 
                                        required={hasVt} 
                                        defaultValue={initialData?.vt_linha}
                                        onInput={(e) => e.currentTarget.value = e.currentTarget.value.toUpperCase()}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vt_qtd_por_dia">Qtd. por Dia <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="vt_qtd_por_dia" 
                                        name="vt_qtd_por_dia" 
                                        type="number" 
                                        required={hasVt} 
                                        defaultValue={initialData?.vt_qtd_por_dia}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Adiantamento Salarial */}
                    <div className="space-y-4 border p-4 rounded-md">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="has_adv" checked={hasAdv} onCheckedChange={(c) => setHasAdv(!!c)} />
                            <Label htmlFor="has_adv" className="font-semibold">Adiantamento Salarial</Label>
                        </div>
                        
                        {hasAdv && (
                            <div className="space-y-4 pl-6">
                                <div className="space-y-2">
                                    <Label htmlFor="adv_day">Dia do Mês <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="adv_day" 
                                        name="adv_day" 
                                        type="number" 
                                        min="1" 
                                        max="31" 
                                        required={hasAdv} 
                                        defaultValue={initialData?.adv_day}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adv_periodicity">Periodicidade <span className="text-red-500">*</span></Label>
                                    <Select name="adv_periodicity" required={hasAdv} defaultValue={initialData?.adv_periodicity || "mensal"}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mensal">Mensal</SelectItem>
                                            <SelectItem value="quinzenal">Quinzenal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Observações Gerais</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Textarea
                            id="general_observations"
                            name="general_observations"
                            placeholder="Insira observações gerais sobre a admissão aqui..."
                            className="min-h-[120px]"
                            defaultValue={initialData?.general_observations}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Documentação Obrigatória</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 text-sm text-yellow-800">
                        <p className="font-bold mb-2">Checklist de Documentos (Incluir no arquivo ZIP/RAR):</p>
                        <ul className="list-disc list-inside grid grid-cols-1 gap-1">
                            <li>Documento com foto (RG/CNH)</li>
                            <li>CPF</li>
                            <li>Comprovação de escolaridade</li>
                            <li>CTPS Digital (Print)</li>
                            <li>Título de Eleitor</li>
                            <li>Comprovante de Residência</li>
                            <li>Termo étnico-racial</li>
                            <li>CPF dependentes (&gt;8 anos)</li>
                            <li>Ofício de pensão (se houver)</li>
                            <li>Certidão de nascimento (filhos)</li>
                            <li>Certidão de nascimento/casamento</li>
                            <li>Cartão de Vacinação (filho até 7 anos)</li>
                            <li>Frequência Escolar (filho &gt;7 anos)</li>
                            <li>Exame Admissional (com data)</li>
                            <li>Cartão Transporte (RIOCARD/SINDPASS)</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="file">
                            Arquivo de Documentos (.zip ou .rar) 
                            <span className={isEditing ? "text-gray-400 ml-1" : "text-red-500 ml-1"}>
                                {isEditing ? "(Opcional)" : "*"}
                            </span>
                        </Label>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('file')?.click()}
                            >
                                Selecionar Arquivo
                            </Button>
                            <span className="text-sm text-gray-500">{fileName}</span>
                        </div>
                        <Input 
                            id="file" 
                            name="file" 
                            type="file" 
                            accept=".zip,.rar" 
                            required={!isEditing}
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    const file = e.target.files[0];
                                    if (file.size > 50 * 1024 * 1024) {
                                        setFileError('O arquivo selecionado excede o limite máximo de 50MB.');
                                        setFileName('');
                                        e.target.value = ''; // Clear input
                                    } else {
                                        setFileError(null);
                                        setFileName(file.name);
                                    }
                                } else {
                                    setFileName(isEditing ? 'Arquivo atual mantido (selecione para alterar)' : '');
                                    setFileError(null);
                                }
                            }}
                        />
                        <p className="text-xs text-gray-500">Tamanho máximo: 50MB.</p>
                    </div>
                </CardContent>
            </Card>

            {fileError && (
                <div className="w-full text-center text-red-500 font-medium p-2 bg-red-50 border border-red-200 rounded mb-4">
                    {fileError}
                </div>
            )}

            <div className="flex flex-col items-end gap-2">
                {error && (
                    <div className="w-full text-center text-red-500 font-medium p-2 bg-red-50 border border-red-200 rounded">
                        {error}
                    </div>
                )}
                <Button type="submit" size="lg" disabled={loading} className={isEditing ? "bg-amber-600 hover:bg-amber-700" : ""}>
                    {loading ? (isEditing ? 'Atualizando...' : 'Enviando...') : (isEditing ? 'Salvar Alterações' : 'Enviar Admissão')}
                </Button>
            </div>
            </form>
        </TooltipProvider>
    );
}
