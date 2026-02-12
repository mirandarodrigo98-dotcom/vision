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
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  status?: string | null;
  dismissal_date?: string | null;
  transfer_date?: string | null;
}

interface Vacation {
  id: string;
  start_date: string;
  end_date?: string;
  days: number;
  status: string;
}

interface Leave {
  id: string;
  start_date: string;
  end_date?: string;
  days?: number;
  type?: string; // motivo/tipo
  status: string;
}

interface EmployeeFormProps {
    companies: Array<{ id: string; nome: string; cnpj: string }>;
    initialData?: Employee;
    readOnly?: boolean;
    vacations?: Vacation[];
    leaves?: Leave[];
}

export function EmployeeForm({ companies, initialData, readOnly, vacations = [], leaves = [] }: EmployeeFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [admissionDate, setAdmissionDate] = useState<Date | undefined>(
        initialData?.admission_date ? new Date(initialData.admission_date) : undefined
    );
    const [birthDate, setBirthDate] = useState<Date | undefined>(
        initialData?.birth_date ? new Date(initialData.birth_date) : undefined
    );

    // Calculate dynamic status
    let displayStatus = initialData?.status || 'Admitido';
    
    // Normalize status strings from DB if necessary
    if (displayStatus === 'ACTIVE') displayStatus = 'Admitido';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parseDateStr = (dateStr?: string | null) => {
        if (!dateStr) return null;
        // Handle T separator
        const cleanDate = dateStr.split('T')[0];
        const [y, m, d] = cleanDate.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    // Check for active Vacation
    // User said: "Férias = o período em que o funcionário está de férias"
    // Only if status is NOT 'Desligado'
    if (displayStatus !== 'Desligado') {
        const activeVacation = vacations.find(v => {
            if (v.status !== 'COMPLETED') return false; 
            const start = parseDateStr(v.start_date);
            if (!start) return false;
            
            // Calculate end date based on days if end_date not present, or use end_date
            let end = v.end_date ? parseDateStr(v.end_date) : null;
            if (!end) {
                end = new Date(start);
                end.setDate(end.getDate() + (v.days || 0) - 1);
            }
            
            return today >= start && today <= end;
        });

        if (activeVacation) {
            displayStatus = 'Férias';
        }

        // Check for active Leave
        const activeLeave = leaves.find(l => {
             if (l.status !== 'COMPLETED') return false;
             const start = parseDateStr(l.start_date);
             if (!start) return false;
             
             const end = l.end_date ? parseDateStr(l.end_date) : null;
             
             // If no end date (open leave), assume active if started in past/today
             if (!end) return today >= start;
             return today >= start && today <= end;
        });

        if (activeLeave) {
            displayStatus = 'Afastamento';
        }
    }

    // Determine status color/badge style could be nice, but user just asked for the field.

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

    const formatDateDisplay = (dateStr?: string | null) => {
        const date = parseDateStr(dateStr);
        if (!date) return '-';
        return format(date, 'dd/MM/yyyy');
    };

    return (
        <div className="space-y-6">
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
                    <div className="flex flex-col space-y-4">
                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <Label htmlFor="company_id" className="text-right font-medium">Empresa:</Label>
                            {readOnly ? (
                                <Input 
                                    value={companies.find(c => c.id === initialData?.company_id)?.nome || ''} 
                                    readOnly 
                                    disabled
                                    className="max-w-[600px]"
                                />
                            ) : (
                                <Select name="company_id" defaultValue={initialData?.company_id} required>
                                    <SelectTrigger className="max-w-[600px]">
                                        <SelectValue placeholder="Selecione a empresa" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companies.map((company) => (
                                            <SelectItem key={company.id} value={company.id}>
                                                {company.nome} ({company.cnpj})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <Label htmlFor="code" className="text-right font-medium">Código:</Label>
                            <Input 
                                id="code" 
                                name="code" 
                                defaultValue={initialData?.code || ''} 
                                placeholder="Código" 
                                readOnly={readOnly}
                                disabled={readOnly}
                                className="w-32"
                            />
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <Label htmlFor="name" className="text-right font-medium">Nome:</Label>
                            <Input 
                                id="name" 
                                name="name" 
                                defaultValue={initialData?.name} 
                                required 
                                placeholder="Nome completo" 
                                readOnly={readOnly}
                                disabled={readOnly}
                                className="max-w-[600px]"
                            />
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <Label htmlFor="esocial_registration" className="text-right font-medium">Matrícula eSocial:</Label>
                            <Input 
                                id="esocial_registration" 
                                name="esocial_registration" 
                                defaultValue={initialData?.esocial_registration || ''} 
                                required 
                                placeholder="Matrícula" 
                                readOnly={readOnly}
                                disabled={readOnly}
                                className="w-48"
                            />
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <Label className="text-right font-medium">Data de Admissão:</Label>
                            <DatePicker
                                date={admissionDate}
                                setDate={setAdmissionDate}
                                disabled={readOnly}
                                className="w-[240px]"
                                placeholder="Selecione"
                            />
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <Label className="text-right font-medium">Data de Desligamento:</Label>
                            <Input 
                                value={initialData?.dismissal_date ? formatDateDisplay(initialData.dismissal_date) : ''} 
                                readOnly 
                                disabled 
                                placeholder="-"
                                className="w-[240px]"
                            />
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <Label className="text-right font-medium">Data de Nascimento:</Label>
                            <DatePicker
                                date={birthDate}
                                setDate={setBirthDate}
                                disabled={readOnly}
                                className="w-[240px]"
                                placeholder="Selecione"
                            />
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <Label htmlFor="cpf" className="text-right font-medium">CPF:</Label>
                            <Input 
                                id="cpf" 
                                name="cpf" 
                                defaultValue={initialData?.cpf || ''} 
                                required 
                                placeholder="000.000.000-00" 
                                readOnly={readOnly}
                                disabled={readOnly}
                                className="w-48"
                            />
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <Label htmlFor="pis" className="text-right font-medium">PIS:</Label>
                            <Input 
                                id="pis" 
                                name="pis" 
                                defaultValue={initialData?.pis || ''} 
                                placeholder="000.00000.00-0" 
                                readOnly={readOnly}
                                disabled={readOnly}
                                className="w-64"
                            />
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <Label htmlFor="gender" className="text-right font-medium">Sexo:</Label>
                            {readOnly ? (
                                <Input value={initialData?.gender || ''} readOnly disabled className="w-48" />
                            ) : (
                                <Select name="gender" defaultValue={initialData?.gender || undefined} required>
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Masculino">Masculino</SelectItem>
                                        <SelectItem value="Feminino">Feminino</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                            <Label className="text-right font-medium">Status:</Label>
                            <Input 
                                value={displayStatus} 
                                readOnly 
                                disabled 
                                className="w-48 font-semibold"
                            />
                        </div>

                        {initialData?.transfer_date && (
                            <div className="grid grid-cols-[200px_1fr] items-center gap-4">
                                <Label className="text-right font-medium">Data de Transferência:</Label>
                                <Input 
                                    value={formatDateDisplay(initialData.transfer_date)} 
                                    readOnly 
                                    disabled 
                                    className="w-[240px]"
                                />
                            </div>
                        )}
                    </div>

                    {!readOnly && (
                        <div className="flex justify-end space-x-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => router.back()}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Salvando...' : (initialData ? 'Atualizar' : 'Criar')}
                            </Button>
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>

        {/* Histórico de Férias - Somente Visualização */}
        <Card>
            <CardHeader>
                <CardTitle>Histórico de Férias</CardTitle>
            </CardHeader>
            <CardContent>
                {vacations.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum registro de férias concluído.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Início</TableHead>
                                <TableHead>Fim</TableHead>
                                <TableHead>Dias</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vacations.map((vacation) => (
                                <TableRow key={vacation.id}>
                                    <TableCell>{formatDateDisplay(vacation.start_date)}</TableCell>
                                    <TableCell>{formatDateDisplay(vacation.end_date)}</TableCell>
                                    <TableCell>{vacation.days}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>

        {/* Histórico de Afastamentos - Somente Visualização */}
        <Card>
            <CardHeader>
                <CardTitle>Histórico de Afastamentos</CardTitle>
            </CardHeader>
            <CardContent>
                {leaves.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhum registro de afastamento concluído.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Início</TableHead>
                                <TableHead>Fim</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Dias</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaves.map((leave) => (
                                <TableRow key={leave.id}>
                                    <TableCell>{formatDateDisplay(leave.start_date)}</TableCell>
                                    <TableCell>{formatDateDisplay(leave.end_date)}</TableCell>
                                    <TableCell>{leave.type || '-'}</TableCell>
                                    <TableCell>{leave.days || '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
        </div>
    );
}
