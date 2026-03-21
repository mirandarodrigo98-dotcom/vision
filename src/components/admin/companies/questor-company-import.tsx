'use client';

import { useState, useEffect } from 'react';
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
import { RefreshCw, Search, Check } from 'lucide-react';
import { toast } from 'sonner';
import { saveQuestorCompany } from '@/app/actions/companies';
import { fetchCompanyFromQuestor, QuestorCompanyData } from '@/app/actions/integrations/questor-companies';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function QuestorCompanyImport() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'search' | 'select'>('search');
  const [identifier, setIdentifier] = useState('');
  const [fetchedCompanies, setFetchedCompanies] = useState<QuestorCompanyData[]>([]);
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const resetState = () => {
    setStep('search');
    setFetchedCompanies([]);
    setIdentifier('');
    setSelectedCompanyCode(null);
    setLoading(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(resetState, 300);
    }
  };

  const handleSearch = async () => {
    if (!identifier) {
      toast.error('Informe o código.');
      return;
    }

    setLoading(true);
    try {
      const result = await fetchCompanyFromQuestor(identifier);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.existing) {
          toast.warning(`Atenção: Empresa já cadastrada no sistema (ID: ${result.existing.id}).`);
      }

      // Convert single result to array for the table
      if (result.data) {
        setFetchedCompanies([result.data]);
        // Auto-select the only result
        setSelectedCompanyCode(result.data.company.code);
      }
      
      setStep('select');

    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || 'Erro ao conectar com o servidor.';
      if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
         toast.error('Erro 404. Verifique a URL do Questor e se a rotina "EmpresasVision" existe.');
      } else {
         toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedCompanyCode) return;
    
    const companyToImport = fetchedCompanies.find(c => c.company.code === selectedCompanyCode);
    if (!companyToImport) return;

    setLoading(true);
    try {
      // Adapt to flat structure expected by saveQuestorCompany
      const flatData = {
        code: companyToImport.company.code,
        nome: companyToImport.company.name,
        razao_social: companyToImport.company.razao_social,
        cnpj: companyToImport.company.cnpj,
        filial: '1', // Default
        telefone: companyToImport.company.telefone,
        email_contato: companyToImport.company.email,
        address_street: companyToImport.address.logradouro,
        address_number: companyToImport.address.numero,
        address_complement: companyToImport.address.complemento,
        address_neighborhood: companyToImport.address.bairro,
        address_zip_code: companyToImport.address.cep,
        municipio: companyToImport.address.cidade,
        uf: companyToImport.address.uf,
        data_abertura: companyToImport.company.data_abertura,
        is_active: 1,
        socios: [] // Socios ignored for now as per request
      };

      const result = await saveQuestorCompany(flatData);
      
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.error || 'Erro ao importar empresa.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar importação.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract keys from the first raw object
  const getRawKeys = () => {
    if (fetchedCompanies.length > 0 && fetchedCompanies[0].raw) {
        return Object.keys(fetchedCompanies[0].raw);
    }
    return [];
  };

  const rawKeys = getRawKeys();

  const toggleSelect = (code: string) => {
    if (selectedCompanyCode === code) {
      setSelectedCompanyCode(null);
    } else {
      setSelectedCompanyCode(code);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Questor SYN
        </Button>
      </DialogTrigger>
      <DialogContent className={step === 'select' ? "max-w-[95vw] w-full sm:max-w-[1200px]" : "sm:max-w-[600px]"}>
        <DialogHeader>
          <DialogTitle>Importar Empresa do Questor</DialogTitle>
          <DialogDescription>
            {step === 'search' 
              ? 'Busque a empresa no Questor SYN.'
              : 'Confira os dados retornados e selecione para importar.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'search' && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="identifier" className="text-right">
                Cód. Empresa
              </Label>
              <div className="col-span-3">
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ex: 123"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  autoFocus
                />
              </div>
            </div>
             <p className="text-xs text-muted-foreground text-center px-4">
                 Busca dados no Questor SYN. Requer a rotina "EmpresasVision" configurada no nWeb.
              </p>
          </div>
        )}

        {step === 'select' && fetchedCompanies.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <h3 className="font-semibold">Dados da Empresa Encontrada</h3>
            </div>

            <div className="max-h-[500px] overflow-auto border rounded-md relative w-full max-w-[calc(95vw-3rem)] sm:max-w-[calc(1200px-4rem)]">
                <div className="w-max min-w-full">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-20">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[50px] sticky left-0 bg-background z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          {/* Checkbox */}
                        </TableHead>
                        {rawKeys.length > 0 ? (
                            // Render Dynamic Columns based on Raw Data keys
                            rawKeys.map(key => (
                                <TableHead key={key} className="whitespace-nowrap px-4 py-2 bg-background font-medium text-foreground">{key}</TableHead>
                            ))
                        ) : (
                            // Fallback if no raw data (e.g. Zen source or empty raw)
                            <>
                                <TableHead className="bg-background">Código</TableHead>
                                <TableHead className="bg-background">Razão Social</TableHead>
                                <TableHead className="bg-background">Nome Fantasia</TableHead>
                                <TableHead className="bg-background">CNPJ</TableHead>
                                <TableHead className="bg-background">Data Abertura</TableHead>
                                <TableHead className="bg-background">Cidade/UF</TableHead>
                                <TableHead className="bg-background">Endereço</TableHead>
                                <TableHead className="bg-background">Contato</TableHead>
                            </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fetchedCompanies.map((companyData) => (
                          <TableRow key={companyData.company.code}>
                            <TableCell className="sticky left-0 bg-background z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                              <Checkbox 
                                checked={selectedCompanyCode === companyData.company.code}
                                onCheckedChange={() => toggleSelect(companyData.company.code)}
                              />
                            </TableCell>
                            
                            {companyData.raw && rawKeys.length > 0 ? (
                                // Render Dynamic Values
                                rawKeys.map(key => (
                                    <TableCell key={key} className="whitespace-nowrap px-4 py-2">
                                        {companyData.raw[key]}
                                    </TableCell>
                                ))
                            ) : (
                                // Fallback Rendering
                                <>
                                    <TableCell className="font-medium">{companyData.company.code}</TableCell>
                                    <TableCell>{companyData.company.razao_social}</TableCell>
                                    <TableCell>{companyData.company.name}</TableCell>
                                    <TableCell>{companyData.company.cnpj}</TableCell>
                                    <TableCell>{companyData.company.data_abertura ? new Date(companyData.company.data_abertura).toLocaleDateString('pt-BR') : '-'}</TableCell>
                                    <TableCell>{companyData.address.cidade}/{companyData.address.uf}</TableCell>
                                    <TableCell className="max-w-[300px] truncate" title={`${companyData.address.logradouro}, ${companyData.address.numero} ${companyData.address.complemento || ''} - ${companyData.address.bairro} - CEP: ${companyData.address.cep}`}>
                                        {companyData.address.logradouro}, {companyData.address.numero} - {companyData.address.bairro}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            {companyData.company.email && <span>{companyData.company.email}</span>}
                                            {companyData.company.telefone && <span>{companyData.company.telefone}</span>}
                                        </div>
                                    </TableCell>
                                </>
                            )}
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'search' ? (
            <Button onClick={handleSearch} disabled={loading}>
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
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('search')}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={loading || !selectedCompanyCode}>
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  'Confirmar Importação'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
