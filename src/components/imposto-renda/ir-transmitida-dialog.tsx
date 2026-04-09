'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { IRDeclaration } from '@/app/actions/imposto-renda';
import { transmitIRDeclaration } from '@/app/actions/imposto-renda';
import { toast } from 'sonner';
import { UploadCloud, X, Loader2, FileText } from 'lucide-react';

interface IRTransmitidaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  declaration: IRDeclaration;
  onSuccess: () => void;
}

export function IRTransmitidaDialog({ open, onOpenChange, declaration, onSuccess }: IRTransmitidaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [restitutionValue, setRestitutionValue] = useState<string>('');
  const [showRestitutionInput, setShowRestitutionInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPhone = !!declaration.phone;
  const hasEmail = !!declaration.email;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newFiles = Array.from(e.target.files);
    const validFiles: File[] = [];

    // CPF only digits
    const expectedCpf = (declaration.cpf || '').replace(/\D/g, '');
    const expectedYear = declaration.year;

    for (const file of newFiles) {
      // 15644108708-IRPF-2026-2025...
      // Extract the first parts
      const parts = file.name.split('-');
      if (parts.length < 3) {
        toast.error(`Arquivo ${file.name} ignorado: formato de nome inválido.`);
        continue;
      }

      const fileCpf = parts[0].replace(/\D/g, '');
      const fileIrpf = parts[1].toUpperCase();
      const fileYear = parts[2]; // Exercício

      if (fileCpf !== expectedCpf) {
        toast.error(`Arquivo ${file.name} ignorado: CPF incompatível (esperado ${expectedCpf}).`);
        continue;
      }

      if (fileIrpf !== 'IRPF') {
        toast.error(`Arquivo ${file.name} ignorado: Não contém a sigla IRPF.`);
        continue;
      }

      if (fileYear !== expectedYear) {
        toast.error(`Arquivo ${file.name} ignorado: Exercício incompatível (esperado ${expectedYear}).`);
        continue;
      }

      // Check size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} ignorado: tamanho maior que 5MB.`);
        continue;
      }

      if (!file.type.includes('pdf')) {
        toast.error(`Arquivo ${file.name} ignorado: Apenas PDF é permitido.`);
        continue;
      }

      if (file.name.toLowerCase().includes('imagem-recibo')) {
        setShowRestitutionInput(true);
      }

      validFiles.push(file);
    }

    setFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove.name.toLowerCase().includes('imagem-recibo')) {
      setShowRestitutionInput(false);
      setRestitutionValue('');
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleTransmit = async () => {
    if (files.length === 0) {
      if (!confirm('Nenhum arquivo anexado. Deseja realmente transmitir a declaração sem enviar comprovantes?')) {
        return;
      }
    }

    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));

      await transmitIRDeclaration(declaration.id, sendWhatsapp, sendEmail, formData, restitutionValue);
      toast.success('Declaração transmitida com sucesso!');
      onSuccess();
      onOpenChange(false);
      
      // Reset
      setFiles([]);
      setSendWhatsapp(false);
      setSendEmail(false);
      setRestitutionValue('');
      setShowRestitutionInput(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao transmitir declaração');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Transmitir Declaração</DialogTitle>
          <DialogDescription>
            Confirme a transmissão da declaração do exercício {declaration.year}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Enviar Recibo e Declaração para o Contribuinte?</Label>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">WhatsApp</p>
                <p className="text-sm text-muted-foreground">{hasPhone ? declaration.phone : 'Não cadastrado'}</p>
              </div>
              <Switch 
                checked={sendWhatsapp} 
                onCheckedChange={setSendWhatsapp} 
                disabled={!hasPhone || loading} 
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">E-mail</p>
                <p className="text-sm text-muted-foreground">{hasEmail ? declaration.email : 'Não cadastrado'}</p>
              </div>
              <Switch 
                checked={sendEmail} 
                onCheckedChange={setSendEmail} 
                disabled={!hasEmail || loading} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">Anexar PDFs (Recibo / Declaração)</Label>
            <p className="text-xs text-muted-foreground">
              Nome obrigatório: <strong className="text-foreground">CPF-IRPF-EXERCICIO-ANO.pdf</strong>
            </p>
            
            <div className="mt-2">
              <input
                type="file"
                multiple
                accept="application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={loading}
              />
              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12 border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                Selecionar PDFs
              </Button>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded border text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100 shrink-0"
                      onClick={() => removeFile(i)}
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {showRestitutionInput && (
              <div className="mt-4 p-3 border rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
                <Label className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                  Valor da Restituição (Opcional)
                </Label>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mb-2">
                  Identificamos o arquivo de recibo. Informe o valor para incluir na mensagem.
                </p>
                <Input
                  type="text"
                  placeholder="Ex: 1.250,00"
                  value={restitutionValue}
                  onChange={(e) => setRestitutionValue(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleTransmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Confirmar e Transmitir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
