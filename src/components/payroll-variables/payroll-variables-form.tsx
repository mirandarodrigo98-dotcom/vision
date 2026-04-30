'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, ArrowRightIcon, SaveIcon, SendIcon, ArrowLeftIcon, SearchIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getPayrollEvents, getCompanyEmployees, savePayrollVariables, PayrollEvent } from '@/app/actions/payroll-variables';
import { formatCPF } from '@/lib/validators';

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Formato deve ser YYYY-MM');

interface PayrollVariablesFormProps {
  companyId: string;
  isAdmin: boolean;
}

export function PayrollVariablesForm({ companyId, isAdmin }: PayrollVariablesFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [availableEvents, setAvailableEvents] = useState<PayrollEvent[]>([]);
  const [selectedEventCodes, setSelectedEventCodes] = useState<string[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [monthReference, setMonthReference] = useState('');
  
  // Data structure: { [employeeId]: { [eventCode]: value } }
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [eventsRes, employeesRes] = await Promise.all([
        getPayrollEvents(companyId),
        getCompanyEmployees(companyId)
      ]);
      
      if (eventsRes.data) setAvailableEvents(eventsRes.data);
      if (employeesRes.data) setEmployees(employeesRes.data);
      
      const now = new Date();
      setMonthReference(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      setLoading(false);
    }
    loadData();
  }, [companyId]);

  const toggleEvent = (code: string) => {
    setSelectedEventCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleValueChange = (empId: string, eventCode: string, val: string) => {
    setValues(prev => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {}),
        [eventCode]: val
      }
    }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (selectedEventCodes.length === 0) {
        toast.error('Selecione pelo menos um evento.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handlePrev = () => {
    setStep(step - 1);
  };

  const handleSave = async (isDraft: boolean) => {
    if (!monthReference) {
      toast.error('Informe o mês de referência.');
      return;
    }

    setSubmitting(true);
    
    // Prepare payload
    const payload = {
      selectedEvents: selectedEventCodes,
      employeeValues: values
    };

    const result = await savePayrollVariables(companyId, monthReference, payload, isDraft);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message);
      if (isAdmin) {
        router.push('/admin/payroll-variables');
      } else {
        router.push('/app/payroll-variables');
      }
    }
    setSubmitting(false);
  };

  const selectedEvents = availableEvents.filter(e => selectedEventCodes.includes(e.codigo));
  const filteredEmployees = employees.filter(emp => 
    emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (emp.cpf && emp.cpf.includes(searchTerm))
  );

  // For step 3, we only show employees that have at least one value filled
  const employeesWithValues = employees.filter(emp => {
    const empVals = values[emp.id];
    if (!empVals) return false;
    return Object.values(empVals).some(v => v.trim() !== '');
  });

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-blue-800">Mês/Ano Referência</Label>
            <Input 
              type="month" 
              value={monthReference}
              onChange={(e) => setMonthReference(e.target.value)}
              className="w-48 bg-white"
            />
          </div>
        </div>
      </div>

      {/* STEP 1: Select Events */}
      {step === 1 && (
        <div className="border rounded-md">
          <div className="bg-slate-100 px-4 py-2 border-b font-medium text-slate-700">
            Selecione os Eventos
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Input placeholder="Localizar Lançamento Anterior" className="max-w-xs" />
              <Button variant="secondary" className="gap-2">
                <SearchIcon className="h-4 w-4" />
                Replicar Valores
              </Button>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableEvents.map(event => (
                  <TableRow key={event.codigo}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedEventCodes.includes(event.codigo)}
                        onCheckedChange={() => toggleEvent(event.codigo)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{event.codigo}</TableCell>
                    <TableCell className="font-bold">{event.descricao}</TableCell>
                    <TableCell>{event.referencia}</TableCell>
                    <TableCell>{event.tipo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="bg-slate-50 p-4 border-t flex justify-end">
            <Button onClick={handleNext} className="gap-2 bg-[#5cb85c] hover:bg-[#4cae4c] text-white">
              Próximo Passo
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Enter Values */}
      {step === 2 && (
        <div className="border rounded-md">
          <div className="bg-slate-100 px-4 py-2 border-b font-medium text-slate-700">
            Eventos Variáveis
          </div>
          <div className="p-4">
            <div className="flex justify-end mb-4">
              <div className="flex items-center gap-2">
                <Label>Filtrar Usuário</Label>
                <Input 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cod.</TableHead>
                    <TableHead>Usuário do Cliente</TableHead>
                    <TableHead>CPF</TableHead>
                    {selectedEvents.map(ev => (
                      <TableHead key={ev.codigo} className="min-w-[120px] text-center">
                        <div className="font-bold text-xs">{ev.descricao}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                          ({ev.referencia === 'Hora' ? 'Hs' : ev.referencia === 'Valor' ? 'VLR' : 'Dias'})
                          <span className="bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 text-[8px]">{ev.codigo}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell>{emp.codigo || '-'}</TableCell>
                      <TableCell className="text-xs">{emp.nome}</TableCell>
                      <TableCell className="text-xs">{emp.cpf ? formatCPF(emp.cpf) : '-'}</TableCell>
                      {selectedEvents.map(ev => (
                        <TableCell key={ev.codigo}>
                          <Input 
                            className="h-8 text-right"
                            value={values[emp.id]?.[ev.codigo] || ''}
                            onChange={(e) => handleValueChange(emp.id, ev.codigo, e.target.value)}
                            placeholder={ev.referencia === 'Hora' ? '00:00' : '0,00'}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="bg-slate-50 p-4 border-t flex justify-between">
            <Button onClick={handlePrev} variant="outline" className="gap-2">
              <ArrowLeftIcon className="h-4 w-4" /> Voltar
            </Button>
            <div className="flex gap-2">
              <Button onClick={() => handleSave(true)} variant="outline" disabled={submitting} className="gap-2">
                <SaveIcon className="h-4 w-4" /> Salvar Rascunho
              </Button>
              <Button onClick={handleNext} className="gap-2 bg-[#337ab7] hover:bg-[#286090] text-white">
                Próxima Aba
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Send */}
      {step === 3 && (
        <div className="border rounded-md">
          <div className="bg-slate-100 px-4 py-2 border-b font-medium text-slate-700">
            Resumo do Lançamento
          </div>
          <div className="p-4 space-y-6">
            <p className="text-sm text-muted-foreground">
              Revise os valores informados antes de enviar para o sistema contábil.
            </p>

            <div className="overflow-x-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cod.</TableHead>
                    <TableHead>Usuário do Cliente</TableHead>
                    {selectedEvents.map(ev => (
                      <TableHead key={ev.codigo} className="text-center">{ev.descricao}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesWithValues.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2 + selectedEvents.length} className="text-center py-4">
                        Nenhum valor informado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    employeesWithValues.map(emp => (
                      <TableRow key={emp.id}>
                        <TableCell>{emp.codigo || '-'}</TableCell>
                        <TableCell className="text-xs">{emp.nome}</TableCell>
                        {selectedEvents.map(ev => (
                          <TableCell key={ev.codigo} className="text-right font-medium">
                            {values[emp.id]?.[ev.codigo] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="bg-slate-50 p-4 border-t flex justify-between">
            <Button onClick={handlePrev} variant="outline" className="gap-2">
              <ArrowLeftIcon className="h-4 w-4" /> Voltar
            </Button>
            <div className="flex gap-2">
              <Button 
                onClick={() => handleSave(false)} 
                disabled={submitting || employeesWithValues.length === 0} 
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendIcon className="h-4 w-4" />}
                Enviar para Sincronização
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}