'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { fetchQuestorEmployees, saveQuestorEmployees } from '@/app/actions/employees';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

export function QuestorEmployeeImport() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questorCode, setQuestorCode] = useState('');
  const [step, setStep] = useState<'search' | 'select'>('search');
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [companyData, setCompanyData] = useState<{ id: string, name: string } | null>(null);

  const resetState = () => {
    setStep('search');
    setEmployees([]);
    setSelectedEmployees(new Set());
    setCompanyData(null);
    setQuestorCode('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Small delay to reset state after animation closes
      setTimeout(resetState, 300);
    }
  };

  const handleSearch = async () => {
    if (!questorCode) {
      toast.error('Informe o código Questor.');
      return;
    }

    setLoading(true);
    try {
      const result = await fetchQuestorEmployees(questorCode);
      
      if (result.success && result.employees) {
        setEmployees(result.employees);
        setCompanyData({ id: result.companyId!, name: result.companyName! });
        
        // Select all by default
        const allCpf = new Set<string>(result.employees.map((e: any) => String(e.cpf)));
        setSelectedEmployees(allCpf);
        
        setStep('select');
      } else {
        const errorMsg = result.error || 'Erro ao buscar funcionários.';
        if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
          toast.error('Erro de comunicação (404). Verifique se a URL do Questor está correta nas configurações.');
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!companyData || selectedEmployees.size === 0) return;

    setLoading(true);
    try {
      const employeesToImport = employees.filter(e => selectedEmployees.has(e.cpf));
      const result = await saveQuestorEmployees(companyData.id, employeesToImport);
      
      if (result.success) {
        toast.success(`${result.count} importados, ${result.updated} atualizados.`);
        setOpen(false); // Close dialog on success
      } else {
        toast.error(result.error || 'Erro ao salvar funcionários.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar importação.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.size === employees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(employees.map(e => e.cpf)));
    }
  };

  const toggleSelect = (cpf: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(cpf)) {
      newSelected.delete(cpf);
    } else {
      newSelected.add(cpf);
    }
    setSelectedEmployees(newSelected);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Questor SYN
        </Button>
      </DialogTrigger>
      <DialogContent className={step === 'select' ? "sm:max-w-[800px]" : "sm:max-w-[425px]"}>
        <DialogHeader>
          <DialogTitle>Importar do Questor</DialogTitle>
          <DialogDescription>
            {step === 'search' 
              ? "Informe o código da empresa para buscar funcionários ativos." 
              : `Selecione os funcionários para importar na empresa: ${companyData?.name}`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'search' ? (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                Cód. Questor
              </Label>
              <div className="col-span-3">
                <Input
                  id="code"
                  value={questorCode}
                  onChange={(e) => setQuestorCode(e.target.value)}
                  placeholder="Ex: 123"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedEmployees.size === employees.length && employees.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Admissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.cpf}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedEmployees.has(emp.cpf)}
                          onCheckedChange={() => toggleSelect(emp.cpf)}
                        />
                      </TableCell>
                      <TableCell>{emp.code}</TableCell>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell>{emp.cpf}</TableCell>
                      <TableCell>{format(new Date(emp.admission_date), 'dd/MM/yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <div className="mt-2 text-sm text-muted-foreground text-right">
              {selectedEmployees.size} selecionados de {employees.length}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'search' ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleSearch} disabled={loading || !questorCode}>
                {loading ? (
                    <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Buscando...
                    </>
                ) : (
                    <>
                        <Search className="mr-2 h-4 w-4" />
                        Buscar
                    </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('search')}>Voltar</Button>
              <Button onClick={handleImport} disabled={loading || selectedEmployees.size === 0}>
                {loading ? (
                    <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Importando...
                    </>
                ) : 'Confirmar Importação'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
