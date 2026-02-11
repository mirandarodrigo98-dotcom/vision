'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createLeave, updateLeave } from '@/app/actions/leaves';
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
import { Calendar as CalendarIcon, Upload, FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { FileUpload } from "@/components/ui/file-upload";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface LeaveFormProps {
    companies: Array<{ id: string; nome: string; cnpj: string }>;
    activeCompanyId?: string | null;
    initialData?: any;
    isEditing?: boolean;
    redirectPath?: string;
    readOnly?: boolean;
}

const LEAVE_TYPES = [
    'Acidente de Trabalho',
    'Auxilio Doença',
    'Atestado Médico',
    'Aposentadoria',
    'Casamento',
    'Falecimento',
    'Folga',
    'Licença Paternidade',
    'Licença Maternidade',
    'Serviço Militar'
];

const parseDate = (dateStr: string) => {
    if (!dateStr) return undefined;
    const cleanDate = dateStr.trim().split('T')[0];
    // Handle YYYY-MM-DD explicitly to avoid timezone shifts (treat as local date)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        const [y, m, d] = cleanDate.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(dateStr);
};

export function LeaveForm({ companies, activeCompanyId, initialData, isEditing = false, redirectPath = '/app/leaves', readOnly = false }: LeaveFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState<Date | undefined>(
        initialData?.start_date ? parseDate(initialData.start_date) : undefined
    );
    const [sourceCompanyId, setSourceCompanyId] = useState<string>(initialData?.company_id || activeCompanyId || '');
    const [employees, setEmployees] = useState<Array<{id: string, name: string}>>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialData?.employee_id || '');
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        if (sourceCompanyId) {
            getEmployeesByCompany(sourceCompanyId).then(setEmployees);
            if (sourceCompanyId !== initialData?.company_id) {
                setSelectedEmployeeId('');
            }
        } else {
            setEmployees([]);
            setSelectedEmployeeId('');
        }
    }, [sourceCompanyId, initialData?.company_id]);

    const handleFileChange = (selectedFile: File | null) => {
        if (!selectedFile) {
            setFile(null);
            return;
        }
            
        // Validate size (10MB)
        if (selectedFile.size > 10 * 1024 * 1024) {
            toast.error('O arquivo deve ter no máximo 10MB.');
            return;
        }

        // Validate type
        const allowedTypes = ['application/pdf', 'application/zip', 'application/x-rar-compressed', 'application/vnd.rar', 'image/png', 'image/jpeg'];
        const isRar = selectedFile.name.toLowerCase().endsWith('.rar');
        
        if (!allowedTypes.includes(selectedFile.type) && !isRar) {
            toast.error('Tipo de arquivo inválido. Apenas PDF, ZIP, RAR, PNG e JPG são permitidos.');
            return;
        }

        setFile(selectedFile);
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        if (date) {
            formData.set('start_date', format(date, 'yyyy-MM-dd'));
        } else {
             toast.error('Data do afastamento é obrigatória');
             setLoading(false);
             return;
        }

        if (file) {
            formData.set('attachment', file);
        }

        try {
            let result;
            if (isEditing && initialData?.id) {
                result = await updateLeave(initialData.id, formData);
            } else {
                result = await createLeave(formData);
            }

            if (result.success) {
                toast.success(isEditing ? 'Afastamento atualizado!' : 'Solicitação de afastamento criada!');
                router.push(redirectPath);
                router.refresh();
            } else {
                toast.error(result.error || 'Erro ao salvar afastamento');
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
                <CardTitle>{readOnly ? 'Visualizar Afastamento' : (isEditing ? 'Retificar Afastamento' : 'Nova Solicitação de Afastamento')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <fieldset disabled={readOnly} className="space-y-6 border-none p-0 m-0 group-disabled:opacity-100">
                    {/* Hidden Company ID */}
                    <input type="hidden" name="company_id" value={initialData?.company_id || activeCompanyId || ''} />

                    {/* Employee */}
                    <div className="space-y-2">
                        <Label htmlFor="employee_id">Funcionário *</Label>
                         {isEditing ? (
                             <Input 
                                value={initialData.employee_name} 
                                disabled 
                             />
                         ) : (
                            <Select 
                                name="employee_id" 
                                required 
                                value={selectedEmployeeId}
                                onValueChange={setSelectedEmployeeId}
                                disabled={!sourceCompanyId}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={sourceCompanyId ? "Selecione o funcionário" : "Selecione a empresa primeiro"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(employee => (
                                        <SelectItem key={employee.id} value={employee.id}>
                                            {employee.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                         )}
                         {isEditing && <input type="hidden" name="employee_id" value={initialData.employee_id} />}
                    </div>

                    {/* Leave Date */}
                    <div className="space-y-2 flex flex-col">
                        <Label>Data do Afastamento *</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                    disabled={readOnly}
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

                    {/* Type */}
                    <div className="space-y-2">
                        <Label htmlFor="type">Tipo de Afastamento *</Label>
                        <Select 
                            name="type" 
                            required 
                            defaultValue={initialData?.type}
                            disabled={readOnly}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                {LEAVE_TYPES.map(type => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Observations */}
                    <div className="space-y-2">
                        <Label htmlFor="observations">Observações</Label>
                        <Textarea 
                            id="observations" 
                            name="observations" 
                            defaultValue={initialData?.observations} 
                            placeholder="Observações adicionais (opcional)"
                            disabled={readOnly}
                        />
                    </div>

                    {/* Attachment */}
                    <div className="space-y-2">
                        <Label htmlFor="attachment">Documento Anexo (PDF, ZIP, RAR, PNG, JPG - Máx 10MB)</Label>
                        {!readOnly ? (
                            <div className="flex flex-col gap-2">
                                <FileUpload 
                                    id="attachment" 
                                    onChange={handleFileChange}
                                    value={file}
                                    accept=".pdf,.zip,.rar,.png,.jpg,.jpeg,application/pdf,application/zip,application/x-rar-compressed,application/vnd.rar,image/png,image/jpeg"
                                />
                                {initialData?.downloadLink && !file && (
                                    <p className="text-sm text-muted-foreground">
                                        Arquivo atual: <a href={initialData.downloadLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Baixar documento existente</a>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="p-2 border rounded bg-gray-50">
                                {initialData?.downloadLink ? (
                                    <a href={initialData.downloadLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                                        <Download className="h-4 w-4" />
                                        Baixar Documento Anexo
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground text-sm">Nenhum documento anexado.</span>
                                )}
                            </div>
                        )}
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
