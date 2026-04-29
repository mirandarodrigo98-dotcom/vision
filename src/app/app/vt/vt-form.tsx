'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createTransportVoucher, updateTransportVoucher } from '@/app/actions/transport-vouchers';
import { toast } from 'sonner';
import { ArrowLeft, Save, Send, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function VTForm({ initialData, employees, companyId }: { initialData?: any, employees: any[], companyId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1 = Form, 2 = Summary

    const [month, setMonth] = useState(initialData?.reference_month || new Date().getMonth() + 1);
    const [year, setYear] = useState(initialData?.reference_year || new Date().getFullYear());
    const [notes, setNotes] = useState(initialData?.notes || '');

    // Initialize employee grid
    const [gridData, setGridData] = useState<any[]>(() => {
        if (initialData?.employees?.length > 0) {
            return employees.map(emp => {
                const existing = initialData.employees.find((e: any) => e.employee_id === emp.id);
                return {
                    id: emp.id,
                    code: emp.codigo,
                    name: emp.nome,
                    cpf: emp.cpf,
                    quantity: existing?.quantity || 0,
                    value: existing?.value || 0,
                    total: existing?.total || 0,
                    line: existing?.line || '',
                    observation: existing?.observation || ''
                };
            });
        }
        return employees.map(emp => ({
            id: emp.id,
            code: emp.codigo,
            name: emp.nome,
            cpf: emp.cpf,
            quantity: 0,
            value: 0,
            total: 0,
            line: '',
            observation: ''
        }));
    });

    const handleGridChange = (id: string, field: string, val: any) => {
        setGridData(prev => prev.map(row => {
            if (row.id === id) {
                const newRow = { ...row, [field]: val };
                if (field === 'quantity' || field === 'value') {
                    const q = parseFloat(newRow.quantity) || 0;
                    const v = parseFloat(newRow.value) || 0;
                    newRow.total = (q * v).toFixed(2);
                }
                return newRow;
            }
            return row;
        }));
    };

    const handleSave = async (isDraft: boolean) => {
        const selectedEmployees = gridData.filter(r => r.quantity > 0 || r.value > 0);
        
        if (!isDraft && selectedEmployees.length === 0) {
            toast.error('Preencha os valores para pelo menos um funcionário.');
            return;
        }

        if (!month || !year) {
            toast.error('Informe o mês e ano de referência.');
            return;
        }

        setLoading(true);
        const payload = {
            company_id: companyId,
            reference_month: parseInt(month as any),
            reference_year: parseInt(year as any),
            notes,
            employees: selectedEmployees.map(r => ({
                employee_id: r.id,
                quantity: parseInt(r.quantity) || 0,
                value: parseFloat(r.value) || 0,
                total: parseFloat(r.total) || 0,
                line: r.line,
                observation: r.observation
            }))
        };

        try {
            let res;
            if (initialData?.id) {
                res = await updateTransportVoucher(initialData.id, payload, isDraft);
            } else {
                res = await createTransportVoucher(payload, isDraft);
            }

            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(isDraft ? 'Rascunho salvo com sucesso!' : 'Pedido enviado com sucesso!');
                router.push('/app/vt');
                router.refresh();
            }
        } catch (err) {
            toast.error('Erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    if (step === 2) {
        const selected = gridData.filter(r => r.quantity > 0 || r.value > 0);
        const totalGeral = selected.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);

        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Edição
                    </Button>
                    <h2 className="text-2xl font-bold">Resumo do Pedido VT</h2>
                </div>

                <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="font-semibold">Mês/Ano Referência:</span> {month.toString().padStart(2, '0')}/{year}</div>
                            <div><span className="font-semibold">Total de Funcionários:</span> {selected.length}</div>
                            <div><span className="font-semibold">Valor Total do Pedido:</span> R$ {totalGeral.toFixed(2).replace('.', ',')}</div>
                        </div>

                        {notes && (
                            <div className="mt-4">
                                <span className="font-semibold text-sm">Observações:</span>
                                <p className="text-sm bg-slate-50 p-2 rounded mt-1">{notes}</p>
                            </div>
                        )}

                        <div className="border rounded-md overflow-x-auto mt-6">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Cód.</TableHead>
                                        <TableHead>Funcionário</TableHead>
                                        <TableHead>CPF</TableHead>
                                        <TableHead className="text-right">Qtd.</TableHead>
                                        <TableHead className="text-right">Valor Unit.</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead>Linha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selected.map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell>{r.code || '-'}</TableCell>
                                            <TableCell>{r.name}</TableCell>
                                            <TableCell>{r.cpf || '-'}</TableCell>
                                            <TableCell className="text-right">{r.quantity}</TableCell>
                                            <TableCell className="text-right">R$ {parseFloat(r.value || 0).toFixed(2).replace('.', ',')}</TableCell>
                                            <TableCell className="text-right font-semibold">R$ {parseFloat(r.total || 0).toFixed(2).replace('.', ',')}</TableCell>
                                            <TableCell>{r.line || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-end gap-4 mt-6">
                            <Button variant="outline" onClick={() => handleSave(true)} disabled={loading}>
                                <Save className="h-4 w-4 mr-2" /> Salvar Rascunho
                            </Button>
                            <Button onClick={() => handleSave(false)} disabled={loading}>
                                <Send className="h-4 w-4 mr-2" /> Enviar Pedido
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.back()} disabled={loading}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                    </Button>
                    <h2 className="text-2xl font-bold">{initialData ? 'Editar Pedido VT (Rascunho)' : 'Novo Pedido VT'}</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Mês de Referência</Label>
                    <Input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label>Ano de Referência</Label>
                    <Input type="number" min="2020" max="2100" value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
            </div>

            <div className="border rounded-md bg-white overflow-x-auto max-h-[60vh]">
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <TableRow>
                            <TableHead className="w-[80px]">Cód.</TableHead>
                            <TableHead className="min-w-[200px]">Funcionário</TableHead>
                            <TableHead className="w-[140px]">CPF</TableHead>
                            <TableHead className="w-[100px]">Qtd. VT</TableHead>
                            <TableHead className="w-[120px]">Valor VT</TableHead>
                            <TableHead className="w-[120px]">Total</TableHead>
                            <TableHead className="min-w-[150px]">Linha</TableHead>
                            <TableHead className="min-w-[150px]">Observação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {gridData.map(row => (
                            <TableRow key={row.id}>
                                <TableCell className="text-xs text-muted-foreground">{row.code || '-'}</TableCell>
                                <TableCell className="font-medium text-sm">{row.name}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{row.cpf || '-'}</TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        className="h-8 w-full text-right" 
                                        value={row.quantity} 
                                        onChange={(e) => handleGridChange(row.id, 'quantity', e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        step="0.01"
                                        className="h-8 w-full text-right" 
                                        value={row.value} 
                                        onChange={(e) => handleGridChange(row.id, 'value', e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        className="h-8 w-full text-right font-bold bg-slate-50" 
                                        value={row.total} 
                                        readOnly
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        className="h-8 w-full" 
                                        value={row.line} 
                                        onChange={(e) => handleGridChange(row.id, 'line', e.target.value)}
                                        placeholder="Ex: 484"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        className="h-8 w-full" 
                                        value={row.observation} 
                                        onChange={(e) => handleGridChange(row.id, 'observation', e.target.value)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="space-y-2">
                <Label>Observações Gerais do Pedido</Label>
                <Textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Adicione informações adicionais se necessário..."
                    rows={3}
                />
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
                <div className="text-sm text-muted-foreground">
                    Funcionários preenchidos: {gridData.filter(r => r.quantity > 0 || r.value > 0).length}
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => handleSave(true)} disabled={loading}>
                        <Save className="h-4 w-4 mr-2" /> Salvar Rascunho
                    </Button>
                    <Button onClick={() => setStep(2)} disabled={loading}>
                        Próxima Aba <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}