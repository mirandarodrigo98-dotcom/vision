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
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Papa from 'papaparse';

// --- Step 1: Parameters Schema ---
const paramsSchema = z.object({
  initialCompetence: z.string({ required_error: 'Obrigatório' }).min(1, 'Obrigatório').regex(/^\d{2}\/\d{4}$/, 'Formato MM/AAAA'),
  finalCompetence: z.string({ required_error: 'Obrigatório' }).min(1, 'Obrigatório').regex(/^\d{2}\/\d{4}$/, 'Formato MM/AAAA'),
  companyId: z.string({ required_error: 'Selecione uma empresa' }).min(1, 'Selecione uma empresa'),
  accountantId: z.string({ required_error: 'Selecione um contador' }).min(1, 'Selecione um contador'),
  partnerId: z.string().optional(),
  printAccountantSignature: z.enum(['Sim', 'Não'], { required_error: 'Obrigatório', invalid_type_error: 'Inválido' }),
  generateDigitalAccountantSignature: z.string().optional(),
  printPartnerSignature: z.enum(['Sim', 'Não'], { required_error: 'Obrigatório', invalid_type_error: 'Inválido' }),
  generateDigitalPartnerSignature: z.string().optional(),
});

interface FaturamentoWizardProps {
  accountants: any[];
  companies: Array<{ id: string; razao_social: string; cnpj: string }>;
}

export function FaturamentoWizard({ accountants, companies }: FaturamentoWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<any[]>([]);
  const [billingData, setBillingData] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyCode, setCompanyCode] = useState<string | null>(null);
  
  // Company Search State
  const [openCompany, setOpenCompany] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<z.infer<typeof paramsSchema>>({
    resolver: zodResolver(paramsSchema),
    defaultValues: {
      initialCompetence: '',
      finalCompetence: '',
      companyId: '',
      accountantId: '',
      printAccountantSignature: 'Não',
      printPartnerSignature: 'Não',
    },
  });

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

  // Removed debugLog state and addLog function as requested by user to clean up UI

  const onSubmitStep1 = async (values: z.infer<typeof paramsSchema>) => {
    setLoading(true);
    // setDebugLog([]); // Removed
    // addLog(`Iniciando importação para Empresa ID: ${selectedCompanyId}`); // Converted to console.log
    console.log(`Iniciando importação para Empresa ID: ${selectedCompanyId}`);

    try {
      // Parse dates
      const [initMonth, initYear] = values.initialCompetence.split('/').map(Number);
      const [finalMonth, finalYear] = values.finalCompetence.split('/').map(Number);
      
      // Calculate start and end dates for Questor (First day of start month, Last day of end month)
      const startDate = new Date(initYear, initMonth - 1, 1);
      const endDate = new Date(finalYear, finalMonth, 0); // Last day of previous month (which is current month here because month is 0-indexed in Date constructor but we pass month+1 effectively)
      
      console.log(`Período calculado: ${startDate.toLocaleDateString()} a ${endDate.toLocaleDateString()}`);

      // Helper for DD/MM/YYYY format
      const toBRDate = (date: Date) => {
          const d = date.getDate().toString().padStart(2, '0');
          const m = (date.getMonth() + 1).toString().padStart(2, '0');
          const y = date.getFullYear();
          return `${d}/${m}/${y}`;
      };

      const startDateStr = toBRDate(startDate);
      const endDateStr = toBRDate(endDate);
      
      // Competence Format: 01/MM/YYYY (First day of the competence month)
      const compInicialStr = `01/${values.initialCompetence}`;
      const compFinalStr = `01/${values.finalCompetence}`;

      // Try to fetch from Questor if we have a code
      let fetchedData: any[] = [];
      let usedQuestor = false;
      
      if (companyCode) {
          try {
            console.log(`Tentando buscar no Questor para código: ${companyCode}`);
            // Updated parameters based on integration tests (Questor nWeb Report)
            const reportParams: Record<string, string> = {
                pModelo: '1', // Faturamento
                pTipoFaturamento: '501', // Federal - Junto
                pEmpresa: companyCode,
                pFilial: '1',
                pCompetInicial: values.initialCompetence, // MM/YYYY
                pCompetFinal: values.finalCompetence, // MM/YYYY
                pAssinCont: values.printAccountantSignature === 'Sim' ? '1' : '0',
                pAssinSocio: values.printPartnerSignature === 'Sim' ? '1' : '3', // Responsável=1, Todos=2, Nenhum=3
                pGerarAssinaturaSocio: '1', // Normal=1, Certificado=2
                pIncluirLogo: '0'
            };

            console.log(`Parâmetros Questor: ${JSON.stringify(reportParams)}`);

            // Execute Report
            const result = await executeQuestorReport('nFisRRFaturamentoGrafico', reportParams, 'nrwexCSV');
            
            if (result.error) {
                // Check if it's a connection error or service unavailable
                const isConnectionError = 
                    (typeof result.error === 'string' && (
                        result.error.includes('ECONNREFUSED') || 
                        result.error.includes('fetch failed') ||
                        result.error.includes('500') ||
                        result.error.includes('404')
                    ));

                if (isConnectionError) {
                    console.warn(`Questor inacessível: ${result.error}`);
                    toast.warning('Serviço Questor indisponível. Alternando para modo manual.');
                    // Don't throw, explicitly fall through to manual mode logic below
                } else {
                    console.error(`ERRO API Questor: ${result.error}`);
                    toast.error(`Erro Questor: ${result.error}`);
                }
            } else if (result.data) {
                    console.log(`Questor retornou dados. Tamanho bruto: ${result.data.length} chars`);
                
                let rawData = result.data;
                // Double check if it's JSON (sometimes Server Action might return raw response if parsing failed there)
                if (typeof rawData === 'string' && rawData.trim().startsWith('{')) {
                    try {
                        const json = JSON.parse(rawData);
                        if (json && json.Data) {
                            console.log('Detectado wrapper JSON no frontend, extraindo campo Data...');
                            rawData = json.Data;
                        } else if (json && (json.Erro || json.Exception)) {
                            // Detect Questor specific errors returned as JSON 200 OK
                            const errorMsg = json.Erro || json.Exception || "Erro desconhecido do Questor";
                            console.error(`ERRO QUESTOR (JSON): ${errorMsg}`);
                            toast.error(`Questor: ${errorMsg}`);
                            // Stop processing here as it is an error
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        // Not JSON, continue with rawData
                    }
                }
                
                console.log(`Dados para parsing (primeiros 100 chars): ${rawData.substring(0, 100)}...`);

                // Parse CSV result.data without header assumption because Questor returns a complex report layout
                const parsed = Papa.parse(rawData, { 
                  header: false, 
                  skipEmptyLines: false, // Need to see empty lines to separate blocks potentially
                  dynamicTyping: false,
                  delimiter: ';' // Force delimiter to semicolon
                });
                
                console.log(`Linhas parseadas: ${parsed.data.length}`);

                if (parsed.data && parsed.data.length > 0) {
                   const rows = parsed.data as any[][];
                   const mappedMonths: any[] = [];
                   
                   const targetCode = parseInt(companyCode);
                   if (isNaN(targetCode)) {
                       console.error(`ERRO: Código da empresa inválido para parsing: ${companyCode}`);
                       toast.error('Código da empresa inválido para importação.');
                       setLoading(false);
                       return;
                   }

                   let targetCompanyFound = false;
                   let capturingData = false;
                   
                   const monthMap: Record<string, number> = {
                        'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4, 'MAIO': 5, 'JUNHO': 6,
                        'JULHO': 7, 'AGOSTO': 8, 'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
                   };

                   for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || row.length === 0) continue;
                        
                        const firstCol = typeof row[0] === 'string' ? row[0].trim() : '';
                        
                        // 1. Detect Company Block Start: "0097  NAME..."
                        const companyMatch = firstCol.match(/^(\d+)\s+/);
                        if (companyMatch) {
                            const currentCode = parseInt(companyMatch[1]);
                            if (currentCode === targetCode) {
                                targetCompanyFound = true;
                                capturingData = false; // Wait for table header
                                console.log(`Bloco da empresa ${currentCode} ENCONTRADO na linha ${i}`);
                            } else {
                                if (targetCompanyFound) {
                                     console.log(`Fim do bloco da empresa (nova empresa ${currentCode} encontrada) na linha ${i}`);
                                }
                                targetCompanyFound = false;
                                capturingData = false;
                            }
                            continue;
                        }

                        // 2. Detect Table Header inside target block
                        if (targetCompanyFound && !capturingData) {
                            // Header row usually contains "MÊS" or "ANO"
                            if (firstCol.toUpperCase().includes('MÊS') || (row[1] && String(row[1]).toUpperCase().includes('ANO'))) {
                                capturingData = true;
                                console.log(`Cabeçalho da tabela encontrado na linha ${i}, iniciando captura...`);
                                continue;
                            }
                        }

                        // 3. Capture Data Rows
                        if (targetCompanyFound && capturingData) {
                            // Stop at "TOTAL" or empty line (sometimes empty lines separate blocks)
                            if (firstCol.toUpperCase().includes('TOTAL')) {
                                console.log(`Linha de TOTAL encontrada na linha ${i}, parando captura.`);
                                capturingData = false;
                                targetCompanyFound = false; // Assume done
                                continue;
                            }
                            
                            // Expecting: [MONTH_NAME, YEAR, VALUE]
                            // Example: ["JANEIRO", "2024", "0,00"] or ["JANEIRO", 2024, "0,00"]
                            if (row.length >= 3) {
                                const monthName = String(row[0]).toUpperCase().trim();
                                const yearStr = String(row[1]).trim();
                                const valueStr = String(row[2]).trim();
                                
                                const m = monthMap[monthName];
                                const y = parseInt(yearStr);
                                
                                if (m && !isNaN(y)) {
                                    // Parse Value (BRL: 1.000,00)
                                    const cleanV = valueStr.replace(/\./g, '').replace(',', '.');
                                    const numericValue = parseFloat(cleanV);
                                    
                                    if (!isNaN(numericValue)) {
                                        mappedMonths.push({
                                           month: m,
                                           year: y,
                                           faturado: numericValue,
                                           complemento: 0
                                        });
                                        console.log(`Capturado: ${monthName}/${y} = ${numericValue}`);
                                    }
                                }
                            }
                        }
                   }
                       
                   // Filter by range using numeric comparison (YearMonth) to avoid Timezone/Date object issues
                   const startYm = initYear * 100 + initMonth;
                   const endYm = finalYear * 100 + finalMonth;
                   
                   console.log(`Filtrando intervalo: ${startYm} a ${endYm}`);

                   const validMonths = mappedMonths.filter(item => {
                       const itemYm = item.year * 100 + item.month;
                       const isValid = itemYm >= startYm && itemYm <= endYm;
                       
                       if (!isValid) {
                           console.log(`Filtrado fora: ${item.month}/${item.year} (${itemYm})`);
                       }
                       return isValid;
                   });

                   if (validMonths.length > 0) {
                       setBillingData(validMonths);
                       usedQuestor = true;
                       toast.success('Dados importados do Questor com sucesso!');
                       console.log(`Sucesso! ${validMonths.length} registros importados.`);
                   } else if (mappedMonths.length > 0) {
                       // Found data but outside range? Or maybe empty values?
                       console.log('Dados encontrados mas filtrados (ou vazios). Usando dados brutos encontrados.');
                       // If we found data (even if 0), we can use it.
                       setBillingData(mappedMonths); // Use what we found if filter is too strict or range matches
                       usedQuestor = true;
                       toast.success('Dados importados do Questor com sucesso! (Filtro de data ajustado)');
                   } else {
                       console.log(`Nenhum dado válido encontrado para a empresa ${companyCode}`);
                       // Don't show success if nothing found
                   }
                }
            }
          } catch (e) {
              console.error(`Exceção ao buscar no Questor: ${e}`);
          }
      } else {
          console.log('Empresa sem código vinculado no cadastro.');
          toast.error('Empresa selecionada não possui código vinculado.');
      }
      
      // Fallback Mock Data generation if Questor fails or is not enabled
      if (!usedQuestor) {
          console.log('Usando Fallback (Mock/Zeros) pois Questor falhou ou não retornou dados.');
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
      console.error(`Exceção Geral: ${error}`);
      toast.error('Erro ao buscar dados do faturamento');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return billingData.reduce((acc, item) => acc + item.faturado + (item.complemento || 0), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    
    // Header Layout to match Preview
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName.toUpperCase(), centerX, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text('Demonstrativo Mensal do Faturamento', centerX, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100); // Gray
    doc.text(`Período: ${form.getValues('initialCompetence')} a ${form.getValues('finalCompetence')}`, centerX, 35, { align: 'center' });
    
    doc.setTextColor(0); // Reset to black
    
    // Table Data Preparation
    const tableData = billingData.map(item => [
      getMonthName(item.month),
      item.year,
      formatCurrency(item.faturado + (item.complemento || 0))
    ]);

    // Add Total Row
    // We pass 3 columns. We will use didParseCell to merge the first two for "TOTAL" label.
    tableData.push(['TOTAL', '', formatCurrency(calculateTotal())]);
    
    autoTable(doc, {
      startY: 45,
      head: [['MÊS', 'ANO', 'FATURADO (R$)']],
      body: tableData,
      theme: 'plain', // Clean layout, we draw borders manually
      styles: { 
          fontSize: 10, 
          cellPadding: 3,
          textColor: [0, 0, 0]
      },
      headStyles: { 
          fillColor: [255, 255, 255], 
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'left' // Default left alignment
      },
      columnStyles: {
        0: { cellWidth: 80 }, // MÊS
        1: { cellWidth: 40 }, // ANO
        2: { cellWidth: 60, halign: 'right' } // FATURADO
      },
      didParseCell: (data) => {
          // Total Row Styling
          if (data.section === 'body' && data.row.index === billingData.length) {
              data.cell.styles.fontStyle = 'bold';
              // Merge first two columns for "TOTAL" label
              if (data.column.index === 0) {
                  data.cell.colSpan = 2;
                  data.cell.styles.halign = 'right';
              }
          }
      },
      didDrawCell: (data) => {
          // Manually draw borders to match CSS: border-b-2 border-black, border-b border-gray-100, etc.
          
          // 1. Header Bottom Border (Thick Black)
          if (data.section === 'head') {
             // Draw line at bottom of cell
             doc.setDrawColor(0, 0, 0); // Black
             doc.setLineWidth(0.5); // Thick
             doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
          }
          
          // 2. Body Rows
          if (data.section === 'body') {
              const isTotalRow = data.row.index === billingData.length;
              
              if (isTotalRow) {
                  // Total Row: Top Border (Thick Black)
                  doc.setDrawColor(0, 0, 0); // Black
                  doc.setLineWidth(0.5); // Thick
                  doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
              } else {
                  // Normal Rows: Bottom Border (Thin Gray)
                  doc.setDrawColor(220, 220, 220); // Gray 100 approx
                  doc.setLineWidth(0.1); // Thin
                  doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
              }
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
    
    if (partner && form.getValues('printPartnerSignature') === 'Sim') {
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
                 <div className="flex flex-col gap-4">
                   <div className="space-y-2">
                     <FormField
                        control={form.control}
                        name="companyId"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Empresa</FormLabel>
                            <Popover open={openCompany} onOpenChange={setOpenCompany}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCompany}
                                    className={cn(
                                      "w-full justify-between",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value
                                      ? companies.find((company) => company.id === field.value)?.razao_social
                                      : "Selecione a empresa"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                <div className="flex flex-col">
                                  <div className="flex items-center border-b px-3">
                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                    <Input
                                      placeholder="Digite 3 caracteres..."
                                      value={searchTerm}
                                      onChange={(e) => setSearchTerm(e.target.value)}
                                      className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                                    />
                                  </div>
                                  
                                  <ScrollArea className="max-h-[300px] overflow-y-auto">
                                    <div className="p-1">
                                      {searchTerm.length >= 3 ? (
                                        <>
                                          {companies
                                            .filter(company => 
                                              company.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                              company.cnpj.includes(searchTerm)
                                            )
                                            .length === 0 && (
                                              <div className="py-6 text-center text-sm text-muted-foreground">
                                                Nenhuma empresa encontrada.
                                              </div>
                                            )}

                                          {companies
                                            .filter(company => 
                                              company.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                              company.cnpj.includes(searchTerm)
                                            )
                                            .slice(0, 50)
                                            .map((company) => (
                                              <div
                                                key={company.id}
                                                onClick={() => {
                                                  form.setValue("companyId", company.id);
                                                  setCompanyName(company.razao_social);
                                                  setOpenCompany(false);
                                                }}
                                                className={cn(
                                                  "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                                  company.id === field.value && "bg-accent text-accent-foreground"
                                                )}
                                              >
                                                <div className="w-full">
                                                  <div className="flex w-full justify-between items-center">
                                                    <span className="font-medium">{company.razao_social}</span>
                                                    {company.id === field.value && <Check className="h-4 w-4" />}
                                                  </div>
                                                  <div className="flex gap-2 text-xs text-muted-foreground">
                                                    <span>CNPJ: {company.cnpj}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                        </>
                                      ) : (
                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                          Digite pelo menos 3 caracteres para pesquisar...
                                        </div>
                                      )}
                                    </div>
                                  </ScrollArea>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                   </div>
                   
                   <div className="flex flex-col gap-4">
                       <FormField
                         control={form.control}
                         name="initialCompetence"
                         render={({ field }) => (
                           <FormItem>
                             <FormLabel>Comp. Inicial</FormLabel>
                             <FormControl>
                               <Input 
                                 placeholder="MM/AAAA" 
                                 maxLength={7}
                                 {...field}
                                 onChange={(e) => {
                                   let value = e.target.value.replace(/\D/g, '');
                                   if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2, 6);
                                   field.onChange(value);
                                 }}
                               />
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
                               <Input 
                                 placeholder="MM/AAAA" 
                                 maxLength={7}
                                 {...field}
                                 onChange={(e) => {
                                   let value = e.target.value.replace(/\D/g, '');
                                   if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2, 6);
                                   field.onChange(value);
                                 }}
                               />
                             </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                   </div>
                   
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
                     name="accountantId"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Contador</FormLabel>
                         <Select 
                           onValueChange={field.onChange} 
                           defaultValue={field.value}
                           disabled={form.watch('printAccountantSignature') !== 'Sim'}
                         >
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
                         <Select 
                           onValueChange={field.onChange} 
                           defaultValue={field.value}
                           disabled={form.watch('printPartnerSignature') !== 'Sim'}
                         >
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
                                <TableCell className="text-right">R$ {formatCurrency(item.faturado)}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end">
                                    <Input 
                                        type="text" 
                                        value={formatCurrency(item.complemento)} 
                                        onChange={(e) => {
                                            // Parse BRL currency input back to number
                                            // Remove all non-digits
                                            const rawValue = e.target.value.replace(/\D/g, '');
                                            // Convert to float (divide by 100 for cents)
                                            const numericValue = rawValue ? parseFloat(rawValue) / 100 : 0;
                                            
                                            const newData = [...billingData];
                                            newData[index].complemento = numericValue;
                                            setBillingData(newData);
                                        }}
                                        className="w-32 text-right h-8" 
                                    />
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-bold">
                                R$ {formatCurrency(item.faturado + item.complemento)}
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
