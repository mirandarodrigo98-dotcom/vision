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
import { Loader2, Upload, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { parseEnuvesPdf, saveTransactions } from '@/app/actions/integrations/enuves';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface PdfImportDialogProps {
  companyId: string;
  onSuccess: () => void;
}

export function PdfImportDialog({ companyId, onSuccess }: PdfImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);

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
      const res = await parseEnuvesPdf(formData, companyId);
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

  const handleSave = async () => {
    if (!result || result.success.length === 0) return;
    setIsSaving(true);
    try {
      const res = await saveTransactions(result.success, companyId);
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
      // Reset state when closing
      setTimeout(() => {
        setFile(null);
        setResult(null);
      }, 300);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[98vw] w-full max-h-[95vh] h-[95vh] overflow-hidden flex flex-col p-4">
        <DialogHeader>
          <DialogTitle>Importar Lançamentos via PDF</DialogTitle>
          <DialogDescription>
            Selecione o arquivo PDF contendo os lançamentos. O sistema identificará data, valor e categoria automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 overflow-hidden flex-1 min-h-0">
          {!result ? (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/50 h-[300px]">
                <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                <Label htmlFor="pdf-upload" className="cursor-pointer">
                    <span className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                        Selecionar Arquivo
                    </span>
                    <Input 
                        id="pdf-upload" 
                        type="file" 
                        accept=".pdf" 
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

                <div className="flex-1 border rounded-md overflow-hidden flex flex-col min-h-0">
                    <div className="h-full overflow-auto">
                        <Table>
                            <TableHeader className="bg-muted/50 sticky top-0">
                                <TableRow>
                                    <TableHead className="w-[50px]">Status</TableHead>
                                    <TableHead className="whitespace-nowrap">Data</TableHead>
                                    <TableHead className="min-w-[150px]">Categoria</TableHead>
                                    <TableHead className="text-right whitespace-nowrap">Valor</TableHead>
                                    <TableHead className="min-w-[150px] whitespace-nowrap">Conta</TableHead>
                                    <TableHead>Linha Original / Motivo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {result.success.map((item: any, i: number) => (
                                    <TableRow key={`success-${i}`}>
                                        <TableCell><CheckCircle2 className="h-4 w-4 text-green-500" /></TableCell>
                                        <TableCell className="whitespace-nowrap">{item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-'}</TableCell>
                                        <TableCell>{item.categoryName}</TableCell>
                                        <TableCell className="text-right font-mono whitespace-nowrap">
                                            {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">{item.accountName || '-'}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                                            {item.original_description || item.description}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {result.ignored.map((item: any, i: number) => (
                                    <TableRow key={`ignored-${i}`} className="bg-muted/30">
                                        <TableCell><AlertCircle className="h-4 w-4 text-yellow-500" /></TableCell>
                                        <TableCell>{item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-'}</TableCell>
                                        <TableCell className="text-muted-foreground italic">Não identificada</TableCell>
                                        <TableCell className="text-right font-mono text-muted-foreground">
                                            {item.value ? item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground italic">-</TableCell>
                                        <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]" title={item.line}>
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
  );
}
