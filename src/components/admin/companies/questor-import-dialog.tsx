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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';
import { fetchCompanyFromQuestor, QuestorCompanyData } from '@/app/actions/integrations/questor-companies';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QuestorImportDialogProps {
  mode: 'company' | 'socio';
  onImport: (data: any) => void;
  trigger?: React.ReactNode;
}

export function QuestorImportDialog({ mode, onImport, trigger }: QuestorImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'confirm-socios' | 'select-socio' | 'preview'>('input');
  const [companyCode, setCompanyCode] = useState('');
  const [fetchedData, setFetchedData] = useState<QuestorCompanyData | null>(null);
  const [importSocios, setImportSocios] = useState(true);
  const [selectedSocioIndex, setSelectedSocioIndex] = useState<number | null>(null);

  const resetState = () => {
    setStep('input');
    setCompanyCode('');
    setFetchedData(null);
    setImportSocios(true);
    setSelectedSocioIndex(null);
    setLoading(false);
    // Keep source selection
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) resetState();
  };

  const handleSync = async () => {
    if (!companyCode) {
      toast.error('Informe o código ou CNPJ da empresa.');
      return;
    }

    setLoading(true);
    try {
        const result = await fetchCompanyFromQuestor(companyCode);
        
        if (result.error) {
            toast.error(result.error);
            return;
        }

        if (result.existing) {
             toast.warning(`Atenção: Empresa já cadastrada no sistema (ID: ${result.existing.id}).`);
        }

        const data = result.data!;
        setFetchedData(data);

        if (mode === 'company') {
            if (data.socios.length === 0) {
                toast.info('Nenhum sócio retornado pela API. A empresa será importada sem sócios.');
            }
            setStep('confirm-socios');
        } else {
            // Socio mode
            if (data.socios.length === 0) {
                toast.warning('Nenhum sócio encontrado nesta empresa.');
                setOpen(false);
            } else {
                setStep('select-socio');
            }
        }

    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar dados do Questor.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSocios = async () => {
    if (!fetchedData) return;

    // Adapt data for onImport (Legacy format expected by company-form)
    const adaptedData = adaptToFormFormat(fetchedData, importSocios);
    
    onImport(adaptedData);
    toast.success('Dados importados com sucesso!');
    setOpen(false);
  };

  const handleSelectSocio = () => {
    if (selectedSocioIndex === null || !fetchedData?.socios) return;
    
    const selectedSocio = fetchedData.socios[selectedSocioIndex];
    
    // Adapt single socio import
    const adaptedData = {
        socios: [{
            NOME: selectedSocio.nome,
            CPF: selectedSocio.cpf,
            PERCENTUALPARTICIPACAO: selectedSocio.percentual,
            DATANASCIMENTO: selectedSocio.data_nascimento,
            RG: selectedSocio.rg,
            ORGAOEXPEDIDOR: selectedSocio.orgao_expedidor,
            UFORGAOEXPEDIDOR: selectedSocio.uf_orgao_expedidor,
            DATAEXPEDICAO: selectedSocio.data_expedicao,
            CEP: selectedSocio.cep,
            ENDERECO: selectedSocio.logradouro,
            NUMERO: selectedSocio.numero,
            COMPLEMENTO: selectedSocio.complemento,
            BAIRRO: selectedSocio.bairro,
            NOMEMUNIC: selectedSocio.municipio,
            SIGLAESTADO: selectedSocio.uf
        }]
    };

    onImport(adaptedData);
    toast.success('Sócio importado com sucesso!');
    setOpen(false);
  };

  // Helper to adapt new structure to old expected format
  const adaptToFormFormat = (data: QuestorCompanyData, includeSocios: boolean) => {
      // Create a robust data object that ensures keys match what company-form expects
      const adapted = {
          company: {
              NOME: data.company.razao_social,
              RAZAOSOCIAL: data.company.razao_social,
              NOMEFANTASIA: data.company.name,
              INSCRFEDERAL: data.company.cnpj,
              CODIGOEMPRESA: data.company.code,
              FANTASIA: data.company.name,
              CAPITALSOCIAL: data.company.capital_social, // Legacy key
              
              // Direct properties (New format)
              capital_social: data.company.capital_social,
              email: data.company.email,
              telefone: data.company.telefone,
              razao_social: data.company.razao_social,
              nome: data.company.name,
              cnpj: data.company.cnpj,
              code: data.company.code,
              filial: data.company.filial,
              data_abertura: data.company.data_abertura
          },
          estab: {
              DATAINICIOATIV: data.company.data_abertura,
              TIPOLOGRADOURO: data.address.tipo_logradouro, // Legacy key
              LOGRADOURO: data.address.logradouro,
              NUMERO: data.address.numero,
              COMPLEMENTO: data.address.complemento,
              BAIRRO: data.address.bairro,
              CEP: data.address.cep,
              NOMEMUNIC: data.address.cidade,
              SIGLAESTADO: data.address.uf,
              TELEFONE: data.company.telefone,
              EMAIL: data.company.email,
              CODIGOESTAB: '1', // Default

              // Ensure these are also present in estab for legacy fallback
              capital_social: data.company.capital_social,
              CAPITALSOCIAL: data.company.capital_social
          },
          // Pass the clean address object directly
          address: {
              ...data.address,
              // Redundant keys to ensure mapping success
              tipo_logradouro: data.address.tipo_logradouro,
              logradouro: data.address.logradouro,
              numero: data.address.numero,
              complemento: data.address.complemento,
              bairro: data.address.bairro,
              cep: data.address.cep,
              cidade: data.address.cidade,
              uf: data.address.uf,
              municipio: data.address.cidade
          },
          socios: includeSocios ? data.socios.map(s => ({
              NOME: s.nome,
              CPF: s.cpf,
              PERCENTUALPARTICIPACAO: s.percentual,
              DATANASCIMENTO: s.data_nascimento,
              RG: s.rg,
              ORGAOEXPEDIDOR: s.orgao_expedidor,
              UFORGAOEXPEDIDOR: s.uf_orgao_expedidor,
              DATAEXPEDICAO: s.data_expedicao,
              CEP: s.cep,
              ENDERECO: s.logradouro,
              NUMERO: s.numero,
              COMPLEMENTO: s.complemento,
              BAIRRO: s.bairro,
              NOMEMUNIC: s.municipio,
              SIGLAESTADO: s.uf
          })) : []
      };

      console.log('Questor Import Data Adapted:', adapted);
      return adapted;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Questor SYN
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Importar do Questor</DialogTitle>
          <DialogDescription>
            {step === 'input' && 'Digite o código da empresa para buscar os dados.'}
            {step === 'confirm-socios' && 'Empresa encontrada. Deseja importar os sócios?'}
            {step === 'select-socio' && 'Selecione o sócio que deseja importar.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'input' && (
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="company-code" className="text-right">
                  Cód. Empresa
                </Label>
                <div className="col-span-3">
                  <Input
                    id="company-code"
                    value={companyCode}
                    onChange={(e) => {
                        setCompanyCode(e.target.value);
                    }}
                    placeholder="Ex: 123"
                    onKeyDown={(e) => e.key === 'Enter' && handleSync()}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center px-4">
                 Busca dados diretamente no Questor SYN.
              </p>
            </div>
          )}

          {step === 'confirm-socios' && fetchedData && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm font-medium">Empresa encontrada:</p>
                <p className="text-lg font-bold">{fetchedData.company.razao_social || fetchedData.company.name}</p>
                <p className="text-sm text-muted-foreground">CNPJ: {fetchedData.company.cnpj}</p>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground border-t pt-2">
                    <div>
                        <p className="font-semibold text-foreground mb-1">Endereço:</p>
                        <p>{fetchedData.address.tipo_logradouro} {fetchedData.address.logradouro}, {fetchedData.address.numero}</p>
                        {fetchedData.address.complemento && <p>{fetchedData.address.complemento}</p>}
                        <p>{fetchedData.address.bairro} - {fetchedData.address.cidade}/{fetchedData.address.uf}</p>
                        <p>CEP: {fetchedData.address.cep}</p>
                    </div>
                    <div>
                         <p className="font-semibold text-foreground mb-1">Outros Dados:</p>
                         <p>Capital Social: {fetchedData.company.capital_social ? Number(fetchedData.company.capital_social).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não informado'}</p>
                         <p>Telefone: {fetchedData.company.telefone || '-'}</p>
                         <p>Email: {fetchedData.company.email || '-'}</p>
                         <p>Data Abertura: {fetchedData.company.data_abertura ? new Date(fetchedData.company.data_abertura).toLocaleDateString('pt-BR') : '-'}</p>
                    </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="import-socios" 
                  checked={importSocios} 
                  onCheckedChange={(c) => setImportSocios(!!c)} 
                />
                <Label htmlFor="import-socios">Importar também os sócios vinculados?</Label>
              </div>

              {fetchedData.raw && (
                  <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">Ver Dados Brutos (Debug)</summary>
                      <pre className="mt-2 p-2 bg-slate-950 text-slate-50 rounded overflow-auto max-h-[200px]">
                          {JSON.stringify(fetchedData.raw, null, 2)}
                      </pre>
                  </details>
              )}
            </div>
          )}

          {step === 'select-socio' && fetchedData?.socios && (
            <div className="space-y-4">
               <div className="rounded-md bg-muted p-4 mb-4">
                <p className="text-sm font-medium">Empresa:</p>
                <p className="text-base">{fetchedData.company.razao_social || fetchedData.company.name}</p>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                {fetchedData.socios.map((socio: any, index: number) => (
                  <div 
                    key={index}
                    className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedSocioIndex === index ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}
                    onClick={() => setSelectedSocioIndex(index)}
                  >
                    <p className="font-medium">{socio.NOME}</p>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>CPF: {socio.CPF}</span>
                      <span>Part: {socio.PERCENTUALPARTICIPACAO || socio.PARTICIPACAO || '0'}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'input' && (
            <Button onClick={handleSync} disabled={loading || !companyCode}>
              {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Sincronizar
            </Button>
          )}
          {step === 'confirm-socios' && (
            <Button onClick={handleConfirmSocios} disabled={loading}>
              {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Importação
            </Button>
          )}
          {step === 'select-socio' && (
             <Button onClick={handleSelectSocio} disabled={selectedSocioIndex === null}>
              Importar Sócio
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
