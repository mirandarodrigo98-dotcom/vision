'use client';

import { useState, useMemo } from 'react';
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
import { Loader2, Upload, AlertCircle, CheckCircle2, FileText, PlusCircle } from 'lucide-react';
import { parseEklesiaCsv, saveTransactionsBatch, createCategory } from '@/app/actions/integrations/eklesia';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, isValid } from 'date-fns';

interface CsvImportDialogProps {
  companyId: string;
  onSuccess: () => void;
}

export function CsvImportDialog({ companyId, onSuccess }: CsvImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Missing categories registration state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isRegisteringCategories, setIsRegisteringCategories] = useState(false);
  const [categoryInputs, setCategoryInputs] = useState<Record<string, string>>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await parseEklesiaCsv(formData, companyId);
      if (res.error) {
        toast.error(res.error);
      } else {
        setResult(res);
      }
    } catch (error) {
      toast.error('Erro ao processar arquivo');
    } finally {
      setIsParsing(false);
    }
  };

  const getMissingCategories = (ignored: any[]) => {
    if (!ignored) return [];
    const missing = ignored.filter(i => i.reason === 'Categoria não encontrada ou não cadastrada no sistema' && i.originalCategory);
    
    const uniqueMap = new Map<string, any>();
    missing.forEach(item => {
      if (!uniqueMap.has(item.originalCategory)) {
        uniqueMap.set(item.originalCategory, {
          name: item.originalCategory,
          nature: item.isNegative ? 'Saída' : 'Entrada'
        });
      }
    });
    return Array.from(uniqueMap.values());
  };

  const missingCategoriesList = useMemo(() => {
    if (!result) return [];
    return getMissingCategories(result.ignored);
  }, [result]);

  const handleCategoryInputChange = (name: string, value: string) => {
    setCategoryInputs(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterCategories = async () => {
    setIsRegisteringCategories(true);
    try {
      let registeredCount = 0;
      for (const cat of missingCategoriesList) {
        const integrationCode = categoryInputs[cat.name] || '';
        
        const res = await createCategory({
          description: cat.name.substring(0, 50),
          nature: cat.nature,
          integration_code: integrationCode
        }, companyId);
        
        if (!res?.error) {
          registeredCount++;
        }
      }
      
      if (registeredCount > 0) {
        toast.success(`${registeredCount} categorias cadastradas com sucesso!`);
        setShowCategoryModal(false);
        // Reprocess the file automatically
        await handleParse();
      } else {
        toast.error('Nenhuma categoria foi cadastrada. Verifique se elas já existem.');
      }
    } catch (error) {
      toast.error('Erro ao cadastrar categorias');
    } finally {
      setIsRegisteringCategories(false);
    }
  };

  const handleSave = async () => {
    if (!result || result.success.length === 0) return;
    setIsSaving(true);
    try {
      const res = await saveTransactionsBatch(result.success, companyId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`${result.success.length} lançamentos importados com sucesso!`);
        setIsOpen(false);
        setFile(null);
        setResult(null);
        onSuccess();
      }
    } catch (error) {
      toast.error('Erro ao salvar lançamentos');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => {
        setFile(null);
        setResult(null);
        setShowCategoryModal(false);
        setCategoryInputs({});
      }, 300);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[90vw] xl:max-w-[85vw] w-full max-h-[95vh] h-[95vh] overflow-hidden flex flex-col p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Importar Lançamentos via CSV</DialogTitle>
              <DialogDescription>
                Selecione o arquivo CSV contendo os lançamentos.
              </DialogDescription>
            </DialogHeader>

          <div className="grid gap-4 py-4 overflow-hidden flex-1 min-h-0">
            {!result ? (
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/50 h-[300px]">
                  <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                      <span className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                          Selecionar Arquivo
                      </span>
                      <Input 
                          id="csv-upload" 
                          type="file" 
                          accept=".csv" 
                          className="hidden" 
                          onChange={handleFileChange}
                      />
                  </Label>
                  {file && <p className="mt-2 text-sm text-muted-foreground">{file.name}</p>}
                  
                  <Button 
                      className="mt-4" 
                      onClick={handleParse} 
                      disabled={!file || isParsing}
                  >
                      {isParsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Processar Arquivo
                  </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 overflow-hidden h-full">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              {result.success.length} Encontrados
                          </Badge>
                          <Badge variant="outline" className="border-yellow-500 text-yellow-700 bg-yellow-50">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              {result.ignored.length} Ignorados
                          </Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
                          Voltar
                      </Button>
                  </div>

                  {missingCategoriesList.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-md flex items-center justify-between shrink-0">
                      <div>
                        <h4 className="font-semibold text-blue-800">Categorias não localizadas</h4>
                        <p className="text-sm text-blue-600">
                          Existem lançamentos sem categorias cadastradas. Deseja cadastrá-las agora?
                        </p>
                      </div>
                      <Button onClick={() => setShowCategoryModal(true)} variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Cadastrar Categorias
                      </Button>
                    </div>
                  )}

                  <div className="flex-1 border rounded-md overflow-hidden flex flex-col min-h-0 shadow-inner">
                      <div className="h-full overflow-auto relative">
                            <div className="min-w-[1200px] w-full">
                                <Table>
                              <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                                  <TableRow>
                                      <TableHead className="w-[50px] bg-muted">Status</TableHead>
                                      <TableHead className="whitespace-nowrap bg-muted">Data</TableHead>
                                      <TableHead className="min-w-[200px] bg-muted">Categoria</TableHead>
                                      <TableHead className="text-right whitespace-nowrap bg-muted">Valor</TableHead>
                                      <TableHead className="min-w-[200px] whitespace-nowrap bg-muted">Conta</TableHead>
                                      <TableHead className="bg-muted">Histórico / Motivo</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {result.success.map((item: any, i: number) => (
                                      <TableRow key={`success-${i}`}>
                                          <TableCell><CheckCircle2 className="h-4 w-4 text-green-500" /></TableCell>
                                          <TableCell className="whitespace-nowrap">
                                                  {item.date ? (
                                                    (() => {
                                                      try {
                                                        const parsed = typeof item.date === 'string' && item.date.includes('T') ? new Date(item.date) : new Date(item.date + 'T12:00:00');
                                                        return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : '-';
                                                      } catch (e) {
                                                        return '-';
                                                      }
                                                    })()
                                                  ) : '-'}
                                              </TableCell>
                                          <TableCell>{item.categoryName}</TableCell>
                                          <TableCell className="text-right font-mono whitespace-nowrap">
                                              {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </TableCell>
                                          <TableCell className="whitespace-nowrap">{item.accountName || '-'}</TableCell>
                                          <TableCell className="text-xs text-muted-foreground truncate max-w-[300px]">
                                              {item.original_description || item.description}
                                          </TableCell>
                                      </TableRow>
                                  ))}
                                  {result.ignored.map((item: any, i: number) => (
                                      <TableRow key={`ignored-${i}`} className="bg-muted/30">
                                          <TableCell><AlertCircle className="h-4 w-4 text-yellow-500" /></TableCell>
                                          <TableCell>
                                              {item.date ? (
                                                (() => {
                                                  try {
                                                    const parsed = typeof item.date === 'string' && item.date.includes('T') ? new Date(item.date) : new Date(item.date + 'T12:00:00');
                                                    return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : '-';
                                                  } catch (e) {
                                                    return '-';
                                                  }
                                                })()
                                              ) : '-'}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground italic">Não identificada</TableCell>
                                          <TableCell className="text-right font-mono text-muted-foreground whitespace-nowrap">
                                              {item.value ? item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground italic">-</TableCell>
                                          <TableCell className="text-xs text-muted-foreground truncate max-w-[300px]" title={item.line}>
                                              <span className="font-semibold text-red-500 block">{item.reason}</span>
                                              {item.line}
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                          </div>
                       </div>
                  </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            {result && result.success.length > 0 && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Importação
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[70vw] w-full max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Cadastrar Categorias Não Localizadas</DialogTitle>
              <DialogDescription>
                As categorias abaixo foram encontradas no arquivo mas não existem no sistema. Preencha o código de integração (opcional) para cadastrá-las e reprocessar o arquivo.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto py-4 relative">
              <Table className="w-full min-w-[600px]">
              <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="bg-muted">Categoria</TableHead>
                  <TableHead className="bg-muted">Natureza</TableHead>
                  <TableHead className="bg-muted">Cód. Integração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missingCategoriesList.map((cat) => (
                  <TableRow key={cat.name}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>
                      <Badge variant={cat.nature === 'Entrada' ? 'default' : 'destructive'}>
                        {cat.nature}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Input 
                        placeholder="Código..." 
                        value={categoryInputs[cat.name] || ''}
                        onChange={(e) => handleCategoryInputChange(cat.name, e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="mt-4 shrink-0">
            <Button variant="outline" onClick={() => setShowCategoryModal(false)} disabled={isRegisteringCategories}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterCategories} disabled={isRegisteringCategories}>
              {isRegisteringCategories && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar e Reprocessar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
