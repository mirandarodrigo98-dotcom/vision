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
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { importEmployees } from '@/app/actions/employees';

export function EmployeeImportDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Por favor, selecione um arquivo CSV válido.');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecione um arquivo.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await importEmployees(formData);
      
      if (result.success) {
        toast.success(`${result.count} funcionários importados com sucesso!`);
        setOpen(false);
        setFile(null);
      } else {
        toast.error(result.error || 'Erro ao importar arquivo.');
      }
    } catch (error) {
      toast.error('Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importação CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Importar Funcionários</DialogTitle>
          <DialogDescription>
            Selecione o arquivo CSV para importar funcionários. O arquivo deve conter o código da empresa.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="csv-file" className="text-right">
              Arquivo
            </Label>
            <div className="col-span-3">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Label
                htmlFor="csv-file"
                className="flex h-10 w-full cursor-pointer items-center justify-center rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Upload className="mr-2 h-4 w-4" />
                {file ? 'Alterar arquivo' : 'Escolher arquivo'}
              </Label>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded min-h-[40px]">
            {file ? (
              <>
                <FileText className="h-4 w-4" />
                <span className="truncate">{file.name}</span>
              </>
            ) : (
              <span>Nenhum arquivo selecionado</span>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? 'Importando...' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
