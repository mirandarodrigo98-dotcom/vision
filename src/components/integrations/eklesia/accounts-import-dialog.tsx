'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, CheckCircle2, FileText } from 'lucide-react';
import { parseEklesiaAccountsPDF, saveAccountsBatch } from '@/app/actions/integrations/eklesia';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface AccountsImportDialogProps {
  companyId: string;
  onSuccess: () => void;
}

export function AccountsImportDialog({ companyId, onSuccess }: AccountsImportDialogProps) {
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
      const res = await parseEklesiaAccountsPDF(formData, companyId);
      if (res.error) {
        toast.error(res.error);
      } else {
        setResult(res);
        if (res.success.length === 0) {
            toast.warning('Nenhuma conta encontrada no arquivo.');
        }
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
      const res = await saveAccountsBatch(result.success, companyId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`${res.count} contas importadas/atualizadas com sucesso!`);
        setIsOpen(false);
        setFile(null);
        setResult(null);
        onSuccess();
      }
    } catch (error) {
      toast.error('Erro ao salvar contas');
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
      <DialogContent className="max-w-[800px] w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="p-6 pb-0">
            <DialogHeader>
            <DialogTitle>Importar Contas via PDF</DialogTitle>
            <DialogDescription>
                Selecione o arquivo PDF de contas do Eklesia. O sistema importará o Código Reduzido como Código de Integração.
            </DialogDescription>
            </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
          {!result ? (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/50 h-full">
                <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                <Label htmlFor="acc-pdf-upload" className="cursor-pointer">
                    <div className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors inline-block text-center">
                        Selecionar Arquivo
                    </div>
                    <Input 
                        id="acc-pdf-upload" 
                        type="file" 
                        accept=".pdf" 
                        className="hidden" 
                        onChange={handleFileChange}
                    />
                </Label>
                {file && <p className="mt-2 text-sm text-muted-foreground font-medium">{file.name}</p>}
                
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
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50 px-3 py-1">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {result.success.length} Contas Encontradas
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
                        Voltar
                    </Button>
                </div>

                <div className="border rounded-md overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[120px]">Cód. Reduzido</TableHead>
                                <TableHead>Descrição</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {result.success.map((item: any, i: number) => (
                                <TableRow key={i}>
                                    <TableCell className="font-mono text-xs">{item.integration_code}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
            </Button>
            <Button 
                onClick={handleSave} 
                disabled={!result || result.success.length === 0 || isSaving}
            >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar {result?.success?.length || 0} Contas
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
