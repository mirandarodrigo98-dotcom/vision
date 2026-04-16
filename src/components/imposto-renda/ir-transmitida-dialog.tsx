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
  const [taxToPayValue, setTaxToPayValue] = useState<string>('');
  const [quotasCount, setQuotasCount] = useState<string>('');
  const [quotaValue, setQuotaValue] = useState<string>('');
  const [bankInfo, setBankInfo] = useState<string>('');

  const [showRestitutionInput, setShowRestitutionInput] = useState(false);
  const [showTaxToPayInput, setShowTaxToPayInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPhone = !!declaration.phone;
  const hasEmail = !!declaration.email;

  const extractPdfData = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Em um ambiente de produção real, idealmente faríamos um POST para uma Server Action
      // que usa `pdf-parse` e retorna os dados extraídos, pois ler PDF no client-side via
      // fetch/buffer puro é complexo sem bibliotecas pesadas como pdf.js.
      // Vamos criar um formData e enviar para uma rota de API que extrai os dados.
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/irpf/extract-receipt', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.restitutionValue && data.restitutionValue !== '0,00') {
          setRestitutionValue(data.restitutionValue);
          setShowRestitutionInput(true);
          setShowTaxToPayInput(false);
        } else if (data.taxToPayValue && data.taxToPayValue !== '0,00') {
          setTaxToPayValue(data.taxToPayValue);
          setQuotasCount(data.quotasCount || '1');
          setQuotaValue(data.quotaValue || data.taxToPayValue);
          setBankInfo(data.bankInfo || '');
          setShowTaxToPayInput(true);
          setShowRestitutionInput(false);
        } else {
          // Mantém a opção de restituição aberta por padrão caso o backend falhe
          // para o usuário preencher manualmente
          setShowRestitutionInput(true);
          setShowTaxToPayInput(false);
        }
      } else {
        // Se a API falhar, também mantém o campo de restituição aberto como fallback
        setShowRestitutionInput(true);
      }
    } catch (error) {
      console.error('Failed to extract PDF data:', error);
      setShowRestitutionInput(true);
    }
  };

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
        // Extract data from PDF here (We will need pdf.js or similar to extract text)
        // Since we're on the client side, we can use a server action to parse it, 
        // or a small utility. Let's try to extract basic values if possible.
        extractPdfData(file);
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
      setShowTaxToPayInput(false);
      setRestitutionValue('');
      setTaxToPayValue('');
      setQuotasCount('');
      setQuotaValue('');
      setBankInfo('');
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

      const response = await transmitIRDeclaration(declaration.id, sendWhatsapp, sendEmail, formData, restitutionValue, taxToPayValue, quotasCount, quotaValue, bankInfo);
      
      if (response && response.warning) {
        toast.warning(response.warning, { duration: 10000 });
      } else {
        toast.success('Declaração transmitida com sucesso!');
      }
      
      onSuccess();
      onOpenChange(false);
      
      // Reset
      setFiles([]);
      setSendWhatsapp(false);
      setSendEmail(false);
      setRestitutionValue('');
      setTaxToPayValue('');
      setQuotasCount('');
      setQuotaValue('');
      setBankInfo('');
      setShowRestitutionInput(false);
      setShowTaxToPayInput(false);
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

            {showTaxToPayInput && (
              <div className="mt-4 p-3 border rounded-lg bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 space-y-3">
                <div>
                  <Label className="text-sm font-semibold text-rose-800 dark:text-rose-400">
                    Saldo do Imposto a Pagar (Opcional)
                  </Label>
                  <p className="text-xs text-rose-600 dark:text-rose-500 mb-2">
                    Identificamos saldo a pagar no recibo. Confirme ou ajuste os valores.
                  </p>
                  <Input
                    type="text"
                    placeholder="Ex: 5.916,86"
                    value={taxToPayValue}
                    onChange={(e) => setTaxToPayValue(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-rose-800 dark:text-rose-400">Qtd de Cotas</Label>
                    <Input
                      type="text"
                      placeholder="Ex: 8"
                      value={quotasCount}
                      onChange={(e) => setQuotasCount(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-rose-800 dark:text-rose-400">Valor da Cota (R$)</Label>
                    <Input
                      type="text"
                      placeholder="Ex: 739,60"
                      value={quotaValue}
                      onChange={(e) => setQuotaValue(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-rose-800 dark:text-rose-400">Dados Bancários (Débito)</Label>
                  <Input
                    type="text"
                    placeholder="Ex: Banco Itaú (341), Ag: 9339, Conta: 00333-8"
                    value={bankInfo}
                    onChange={(e) => setBankInfo(e.target.value)}
                    disabled={loading}
                  />
                </div>
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
