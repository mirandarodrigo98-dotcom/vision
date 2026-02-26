'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft, Printer } from 'lucide-react';
import { searchCompanies } from '@/app/actions/search-companies';
import { getCompanySocios, getCompanyDetailsFull } from '@/app/actions/companies';
import { executeQuestorReport } from '@/app/actions/integrations/questor-syn';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import Papa from 'papaparse';

// --- Step 1: Parameters Schema ---
const paramsSchema = z.object({
  initialCompetence: z.string().regex(/^\d{2}\/\d{4}$/, 'Formato MM/AAAA'),
  finalCompetence: z.string().regex(/^\d{2}\/\d{4}$/, 'Formato MM/AAAA'),
  companyId: z.string().min(1, 'Selecione uma empresa'),
  accountantId: z.string().min(1, 'Selecione um contador'),
  partnerId: z.string().optional(), // Optional per print "Imprimir Assinaturas dos Sócios: Nenhum"
  printAccountantSignature: z.enum(['Sim', 'Não']),
  generateDigitalAccountantSignature: z.string().optional(),
  printPartnerSignature: z.string().optional(),
  generateDigitalPartnerSignature: z.string().optional(),
  includeLogo: z.enum(['Sim', 'Não']),
});

interface FaturamentoWizardProps {
  accountants: any[];
}

export function FaturamentoWizard({ accountants }: FaturamentoWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [billingData, setBillingData] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyCode, setCompanyCode] = useState<string | null>(null);
  
  // Company Search State
  const [openCompany, setOpenCompany] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const form = useForm<z.infer<typeof paramsSchema>>({
    resolver: zodResolver(paramsSchema),
    defaultValues: {
      initialCompetence: '',
      finalCompetence: '',
      printAccountantSignature: 'Não',
      includeLogo: 'Não',
      printPartnerSignature: 'Nenhum',
    },
  });

  // Fetch companies on search
  useEffect(() => {
    if (searchQuery.length >= 1) {
      const timer = setTimeout(async () => {
        const results = await searchCompanies(searchQuery);
        setCompanies(results);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setCompanies([]);
    }
  }, [searchQuery]);

  // Fetch partners when company changes
  const selectedCompanyId = form.watch('companyId');
  useEffect(() => {
    async function fetchCompanyData() {
      if (selectedCompanyId) {
        // Fetch partners
        const parts = await getCompanySocios(selectedCompanyId);
        setPartners(parts);
        
        // Fetch company details for Code and CNPJ
        const details = await getCompanyDetailsFull(selectedCompanyId);
        if (details) {
            setCompanyName(details.razao_social || '');
            setCompanyCnpj(details.cnpj || '');
            setCompanyCode(details.code || null);
        }
      } else {
        setPartners([]);
        setCompanyName('');
        setCompanyCnpj('');
        setCompanyCode(null);
      }
    }
    fetchCompanyData();
  }, [selectedCompanyId]);

  const onSubmitStep1 = async (values: z.infer<typeof paramsSchema>) => {
    setLoading(true);
    try {
      // Parse dates
      const [initMonth, initYear] = values.initialCompetence.split('/').map(Number);
      const [finalMonth, finalYear] = values.finalCompetence.split('/').map(Number);
      
      // Calculate start and end dates for Questor (First day of start month, Last day of end month)
      const startDate = new Date(initYear, initMonth - 1, 1);
      const endDate = new Date(finalYear, finalMonth, 0); // Last day of previous month (which is current month here because month is 0-indexed in Date constructor but we pass month+1 effectively)
      // Actually: new Date(year, month, 0) gives last day of previous month.
      // If finalMonth is 12 (December), we want new Date(finalYear, 12, 0) -> Jan 0 of next year -> Dec 31 of current year.
      // So finalMonth is correct index for next month in 0-indexed world? No.
      // Month 1-12.
      // new Date(2025, 1, 0) -> Jan 31, 2025. (Month 1 is Feb).
      // So passing finalMonth directly works if it's 1-based.
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Try to fetch from Questor if we have a code
      let fetchedData: any[] = [];
      let usedQuestor = false;
      
      if (companyCode) {
          try {
            // Note: These parameters are hypothetical based on standard Questor reports.
            // Adjust 'Empresa', 'DataInicial', 'DataFinal' based on actual report definition.
            const reportParams = {
                Empresa: companyCode,
                Filial: '1', // Default?
                DataInicial: startDateStr,
                DataFinal: endDateStr,
            };
            
            // Execute Report
            const result = await executeQuestorReport('nFisRRFaturamentoGrafico', reportParams, 'nrwexCSV');
            
            if (result.data && !result.error) {
                // Parse CSV result.data
                const parsed = Papa.parse(result.data, { 
                  header: true, 
                  skipEmptyLines: true,
                  dynamicTyping: true
                });
                
                if (parsed.data && parsed.data.length > 0) {
                   const rows = parsed.data as any[];
                   // Mapping logic (Flexible)
                   // Expected columns: Mes, Ano, Valor
                   // Or Competencia, Valor
                   
                   const mappedMonths: any[] = [];
                   
                   // Helper to normalize keys
                   const findKey = (keys: string[], candidates: string[]) => keys.find(k => candidates.some(c => k.toLowerCase().includes(c.toLowerCase())));
                   const keys = Object.keys(rows[0]);
                   
                   const monthKey = findKey(keys, ['mes', 'month', 'competencia']);
                   const yearKey = findKey(keys, ['ano', 'year']);
                   const valueKey = findKey(keys, ['valor', 'faturamento', 'total']);
                   
                   if (monthKey && valueKey) {
                       rows.forEach(row => {
                           let m = row[monthKey];
                           let y = yearKey ? row[yearKey] : initYear;
                           let v = row[valueKey];
                           
                           // Handle "MM/YYYY" in monthKey
                           if (typeof m === 'string' && m.includes('/')) {
                               const parts = m.split('/');
                               if (parts.length === 2) {
                                   m = parseInt(parts[0]);
                                   y = parseInt(parts[1]);
                               }
                           }
                           
                           if (m && !isNaN(Number(m)) && !isNaN(Number(v))) {
                               mappedMonths.push({
                                   month: Number(m),
                                   year: Number(y),
                                   faturado: Number(v),
                                   complemento: 0
                               });
                           }
                       });
                       
                       // Filter by range
                       const validMonths = mappedMonths.filter(item => {
                           const date = new Date(item.year, item.month - 1, 1);
                           return date >= startDate && date <= endDate;
                       });

                       if (validMonths.length > 0) {
                           setBillingData(validMonths);
                           usedQuestor = true;
                           toast.success('Dados importados do Questor com sucesso!');
                       }
                   }
                }
            }
          } catch (e) {
              console.error("Questor fetch failed, falling back to mock", e);
          }
      }
      
      // Fallback Mock Data generation if Questor fails or is not enabled
      if (!usedQuestor) {
          const months = [];
          let currentMonth = initMonth;
          let currentYear = initYear;
          
          while (currentYear < finalYear || (currentYear === finalYear && currentMonth <= finalMonth)) {
            months.push({
              month: currentMonth,
              year: currentYear,
              faturado: 0, // Default 0, user can edit
              complemento: 0,
            });
            
            currentMonth++;
            if (currentMonth > 12) {
              currentMonth = 1;
              currentYear++;
            }
          }
          setBillingData(months);
      }
      
      setStep(2);
    } catch (error) {
      toast.error('Erro ao buscar dados do faturamento');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return billingData.reduce((acc, item) => acc + item.faturado + (item.complemento || 0), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };
  
  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(10);
    doc.text(`${companyName}`, 14, 15);
    // doc.text(`CNPJ: ${companyCnpj}`, 14, 20); // We need CNPJ
    
    doc.text(`Período: ${form.getValues('initialCompetence')} a ${form.getValues('finalCompetence')}`, 150, 15);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Demonstrativo Mensal do Faturamento', 105, 30, { align: 'center' });
    
    // Table
    const tableData = billingData.map(item => [
      getMonthName(item.month),
      item.year,
      formatCurrency(item.faturado + (item.complemento || 0))
    ]);
    
    // Add Total Row
    tableData.push(['TOTAL', '', formatCurrency(calculateTotal())]);
    
    autoTable(doc, {
      startY: 40,
      head: [['MÊS', 'ANO', 'FATURADO (R$)']],
      body: tableData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40 },
        2: { cellWidth: 60, halign: 'right' }
      },
      didParseCell: (data) => {
          if (data.row.index === billingData.length) {
              data.cell.styles.fontStyle = 'bold';
          }
      }
    });
    
    // Signatures
    let finalY = (doc as any).lastAutoTable.finalY + 40;
    
    const accountantId = form.getValues('accountantId');
    const accountant = accountants.find(a => a.id === accountantId);
    
    const partnerId = form.getValues('partnerId');
    const partner = partners.find(p => p.cpf === partnerId);
    
    if (accountant) {
        doc.setFontSize(10);
        doc.text(accountant.name, 50, finalY, { align: 'center' });
        doc.text(accountant.qualification || 'CONTADOR', 50, finalY + 5, { align: 'center' });
        doc.text(`CPF: ${accountant.document}`, 50, finalY + 10, { align: 'center' });
        doc.text(`CRC: ${accountant.crc_number}`, 50, finalY + 15, { align: 'center' });
    }
    
    if (partner && form.getValues('printPartnerSignature') !== 'Nenhum') {
         doc.text(partner.nome, 160, finalY, { align: 'center' });
         doc.text('Sócio/Administrador', 160, finalY + 5, { align: 'center' });
         doc.text(`CPF: ${partner.cpf}`, 160, finalY + 10, { align: 'center' });
    }
    
    doc.save('faturamento.pdf');
  };

  return (
    <div className="max-w-5xl mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Emissão de Faturamento</CardTitle>
          <CardDescription>
            Passo {step} de 3: {step === 1 ? 'Parâmetros' : step === 2 ? 'Verificação' : 'Visualização'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {step === 1 && (
             <Form {...form}>
               <form onSubmit={form.handleSubmit(onSubmitStep1)} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <FormLabel>Empresa</FormLabel>
                     <Popover open={openCompany} onOpenChange={setOpenCompany}>
                       <PopoverTrigger asChild>
                         <Button
                           variant="outline"
                           role="combobox"
                           aria-expanded={openCompany}
                           className="w-full justify-between"
                         >
                           {form.watch('companyId')
                             ? companies.find((company) => company.id === form.watch('companyId'))?.razao_social || 'Selecione a empresa...'
                             : "Buscar empresa..."}
                           <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                         </Button>
                       </PopoverTrigger>
                       <PopoverContent className="w-[400px] p-0">
                         <Command shouldFilter={false}>
                           <CommandInput placeholder="Buscar empresa..." onValueChange={setSearchQuery} />
                           <CommandList>
                             <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                             <CommandGroup>
                               {companies.map((company) => (
                                 <CommandItem
                                   key={company.id}
                                   value={company.razao_social}
                                   onSelect={() => {
                                     form.setValue('companyId', company.id);
                                     setCompanyName(company.razao_social);
                                     setOpenCompany(false);
                                   }}
                                 >
                                   <Check
                                     className={cn(
                                       "mr-2 h-4 w-4",
                                       form.watch('companyId') === company.id ? "opacity-100" : "opacity-0"
                                     )}
                                   />
                                   {company.razao_social}
                                 </CommandItem>
                               ))}
                             </CommandGroup>
                           </CommandList>
                         </Command>
                       </PopoverContent>
                     </Popover>
                     {form.formState.errors.companyId && <p className="text-sm text-destructive">{form.formState.errors.companyId.message}</p>}
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                       <FormField
                         control={form.control}
                         name="initialCompetence"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Comp. Inicial</FormLabel>
                             <FormControl>
                               <Input placeholder="MM/AAAA" {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                       <FormField
                         control={form.control}
                         name="finalCompetence"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Comp. Final</FormLabel>
                             <FormControl>
                               <Input placeholder="MM/AAAA" {...field} />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                   </div>
                   
                   <FormField
                     control={form.control}
                     name="accountantId"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Contador</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="Selecione" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             {accountants.map((acc) => (
                               <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   
                   <FormField
                     control={form.control}
                     name="printAccountantSignature"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Imprimir Assinatura Contador</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="Selecione" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             <SelectItem value="Sim">Sim</SelectItem>
                             <SelectItem value="Não">Não</SelectItem>
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   
                   <FormField
                     control={form.control}
                     name="partnerId"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Sócio para Assinatura</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="Selecione" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             <SelectItem value="Nenhum">Nenhum</SelectItem>
                             {partners.map((p, idx) => (
                               <SelectItem key={idx} value={p.cpf}>{p.nome}</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   
                   <FormField
                     control={form.control}
                     name="printPartnerSignature"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Imprimir Assinatura Sócio</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="Selecione" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             <SelectItem value="Nenhum">Nenhum</SelectItem>
                             <SelectItem value="Normal">Normal</SelectItem>
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   
                   <FormField
                     control={form.control}
                     name="includeLogo"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Incluir Logotipo</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl>
                             <SelectTrigger>
                               <SelectValue placeholder="Selecione" />
                             </SelectTrigger>
                           </FormControl>
                           <SelectContent>
                             <SelectItem value="Sim">Sim</SelectItem>
                             <SelectItem value="Não">Não</SelectItem>
                           </SelectContent>
                         </Select>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </div>
               </form>
             </Form>
          )}

          {step === 2 && (
            <div className="space-y-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mês</TableHead>
                            <TableHead>Ano</TableHead>
                            <TableHead className="text-right">Faturado (R$)</TableHead>
                            <TableHead className="text-right">Complemento (R$)</TableHead>
                            <TableHead className="text-right">Total (R$)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {billingData.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>{getMonthName(item.month)}</TableCell>
                                <TableCell>{item.year}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.faturado)}</TableCell>
                                <TableCell className="text-right">
                                    <Input 
                                        type="number" 
                                        className="w-32 ml-auto text-right"
                                        value={item.complemento}
                                        onChange={(e) => {
                                            const newVal = Number(e.target.value);
                                            const newData = [...billingData];
                                            newData[index].complemento = newVal;
                                            setBillingData(newData);
                                        }}
                                    />
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                    {formatCurrency(item.faturado + (item.complemento || 0))}
                                </TableCell>
                            </TableRow>
                        ))}
                        <TableRow className="bg-muted font-bold">
                            <TableCell colSpan={4} className="text-right">TOTAL GERAL</TableCell>
                            <TableCell className="text-right">{formatCurrency(calculateTotal())}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
                <div className="border p-8 rounded-md bg-white text-black shadow-sm min-h-[500px]">
                    {/* Simplified HTML Preview */}
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-bold">{companyName}</h2>
                        <h3 className="text-lg font-bold mt-4">Demonstrativo Mensal do Faturamento</h3>
                        <p className="text-sm text-gray-500">Período: {form.getValues('initialCompetence')} a {form.getValues('finalCompetence')}</p>
                    </div>
                    
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="text-left py-2">MÊS</th>
                                <th className="text-left py-2">ANO</th>
                                <th className="text-right py-2">FATURADO (R$)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {billingData.map((item, index) => (
                                <tr key={index} className="border-b border-gray-100">
                                    <td className="py-2">{getMonthName(item.month)}</td>
                                    <td className="py-2">{item.year}</td>
                                    <td className="py-2 text-right">{formatCurrency(item.faturado + (item.complemento || 0))}</td>
                                </tr>
                            ))}
                            <tr className="font-bold border-t-2 border-black">
                                <td className="py-2 text-right" colSpan={2}>TOTAL</td>
                                <td className="py-2 text-right">{formatCurrency(calculateTotal())}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between">
            {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
            ) : (
                <div />
            )}
            
            {step === 1 && (
                <Button onClick={form.handleSubmit(onSubmitStep1)} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            )}
            
            {step === 2 && (
                <Button onClick={() => setStep(3)}>
                    Próximo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            )}
            
            {step === 3 && (
                <Button onClick={handleGeneratePDF}>
                    <Printer className="mr-2 h-4 w-4" /> Baixar PDF
                </Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
