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
import { Loader2, Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { fetchVacationControlFromQuestor } from '@/app/actions/integrations/questor-vacation-actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

export function VacationControlModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questorCode, setQuestorCode] = useState('');
  const [step, setStep] = useState<'search' | 'results'>('search');
  const [vacationData, setVacationData] = useState<any[]>([]);

  const resetState = () => {
    setStep('search');
    setVacationData([]);
    setQuestorCode('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(resetState, 300);
    }
  };

  const handleSearch = async () => {
    if (!questorCode) {
      toast.error('Informe o código da empresa.');
      return;
    }

    setLoading(true);
    try {
      const result = await fetchVacationControlFromQuestor(questorCode);
      
      if (result.success && result.data) {
        setVacationData(result.data);
        setStep('results');
        if (result.data.length === 0) {
            toast.info('Nenhum dado retornado para esta empresa.');
        } else {
            toast.success(`Encontrados ${result.data.length} registros.`);
        }
      } else {
        toast.error(result.error || 'Erro ao buscar dados.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (vacationData.length === 0) return;
    
    // Obter todas as chaves (colunas) únicas do primeiro objeto
    const headers = Object.keys(vacationData[0]);
    
    const csvContent = [
      headers.join(';'), // Cabeçalho
      ...vacationData.map(row => 
        headers.map(header => {
          const val = row[header];
          return val !== null && val !== undefined ? `"${String(val).replace(/"/g, '""')}"` : '""';
        }).join(';')
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `controle_ferias_${questorCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cleanText = (text: any) => {
    if (text === null || text === undefined) return '-';
    // Substitui &nbsp e &nbsp; por espaço e remove espaços extras
    return String(text).replace(/&nbsp;?/g, ' ').trim();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          Controle de Férias
        </Button>
      </DialogTrigger>
      <DialogContent className={step === 'results' ? "max-w-[100vw] w-screen h-[100vh] m-0 p-6 flex flex-col" : "sm:max-w-[425px]"}>
        <DialogHeader>
          <DialogTitle>Controle de Férias</DialogTitle>
          <DialogDescription>
            {step === 'search' 
              ? 'Informe o código numérico da empresa para buscar o período aquisitivo.' 
              : `Resultados para a empresa: ${questorCode}`}
          </DialogDescription>
        </DialogHeader>

        {step === 'search' ? (
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Código da Empresa (Até 4 dígitos)</Label>
              <Input
                id="code"
                value={questorCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setQuestorCode(value);
                }}
                placeholder="Ex: 123"
                maxLength={4}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
             {vacationData.length > 0 ? (
                <div className="border rounded-md flex-1 overflow-hidden flex flex-col">
                  <ScrollArea className="flex-1 h-full overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                        <TableRow>
                          {Object.keys(vacationData[0]).map((key) => (
                            <TableHead key={key} className="whitespace-nowrap">{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vacationData.map((row, index) => (
                          <TableRow key={index}>
                            {Object.keys(vacationData[0]).map((key) => (
                              <TableCell key={`${index}-${key}`} className="whitespace-nowrap">
                                {cleanText(row[key])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
             ) : (
                 <div className="flex items-center justify-center h-32 border rounded-md bg-muted/20">
                     <p className="text-muted-foreground">Nenhum dado encontrado para a consulta.</p>
                 </div>
             )}
          </div>
        )}

        <DialogFooter>
          {step === 'search' ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSearch} disabled={loading || !questorCode}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Avançar
              </Button>
            </>
          ) : (
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => setStep('search')}>
                Nova Busca
              </Button>
              <div className="flex gap-2">
                  <Button variant="outline" onClick={exportToCSV} disabled={vacationData.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button onClick={() => setOpen(false)}>
                    Fechar
                  </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
