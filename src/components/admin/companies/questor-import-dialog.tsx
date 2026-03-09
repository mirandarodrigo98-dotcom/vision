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
import { fetchQuestorData } from '@/app/actions/integrations/questor-syn';
import { fetchQuestorZenCompany } from '@/app/actions/integrations/questor-zen';
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
  const [fetchedData, setFetchedData] = useState<any>(null);
  const [importSocios, setImportSocios] = useState(true);
  const [selectedSocioIndex, setSelectedSocioIndex] = useState<number | null>(null);
  const [source, setSource] = useState<'zen' | 'syn'>('zen');

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
      if (source === 'zen') {
          // Zen requires CNPJ
          const cleanCode = companyCode.replace(/\D/g, '');
          if (cleanCode.length < 11) {
              toast.error('Para integração com Questor Zen, é necessário informar o CNPJ completo (14 dígitos).');
              setLoading(false);
              return;
          }
          await handleSyncZen();
      } else {
          await handleSyncSyn();
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar dados do Questor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncZen = async () => {
      const result = await fetchQuestorZenCompany(companyCode);
      
      if (result.error) {
          throw new Error(result.error);
      }

      const zenData = result.data;
      console.log('Zen Data:', zenData);

      // Normalization of Zen Data to Vision format (PascalCase keys observed in API)
      const company = {
          CODIGOEMPRESA: zenData.CompanyId || zenData.codigo || companyCode,
          NOME: zenData.Nome || zenData.nome || zenData.razaoSocial || zenData.nomeFantasia, // Razão Social usually
          RAZAOSOCIAL: zenData.Nome || zenData.razaoSocial || zenData.nome,
          NOMEFANTASIA: zenData.NomeFantasia || zenData.nomeFantasia || zenData.Nome || zenData.nome, // Fallback to Name
          INSCRFEDERAL: zenData.InscricaoFederal || zenData.cnpj || zenData.cpfCnpj,
          // Add mapping for address if available in zenData
      };

      const estab = {
          // Zen might return address directly in company object
          CODIGOESTAB: zenData.CodigoEstab || zenData.codigoEstab || '1', // Default to 1 for Zen
          LOGRADOURO: zenData.Logadouro || zenData.logradouro || zenData.endereco, // Note: Logadouro (sic) in Zen API
          NUMERO: zenData.Numero || zenData.numero,
          COMPLEMENTO: zenData.Complemento || zenData.complemento,
          BAIRRO: zenData.Bairro || zenData.bairro,
          CIDADE: zenData.Cidade || zenData.cidade,
          NOMEMUNIC: zenData.Cidade || zenData.cidade, // Vision expects NOMEMUNIC
          UF: zenData.Estado || zenData.uf || zenData.estado,
          SIGLAESTADO: zenData.Estado || zenData.uf || zenData.estado, // Vision expects SIGLAESTADO
          CEP: zenData.Cep || zenData.cep,
          DATAINICIOATIV: zenData.DataInicioRegime || zenData.dataAbertura, // Try to find start date
          TELEFONE: zenData.Telefone || zenData.telefone,
          EMAIL: zenData.Email || zenData.email
      };

      // Socios in Zen
      let socios: any[] = [];
      // Check for socios in various possible keys (PascalCase or camelCase)
      const rawSocios = zenData.Socios || zenData.socios || [];
      
      if (Array.isArray(rawSocios)) {
          socios = rawSocios.map((s: any) => ({
              NOME: s.Nome || s.nome,
              CPF: s.Cpf || s.cpf || s.cpfCnpj || s.InscricaoFederal,
              PERCENTUALPARTICIPACAO: s.Percentual || s.participacao || 0
          }));
      }

      const data = {
          company,
          estab,
          socios
      };

      setFetchedData(data);

      if (mode === 'company') {
        if (socios.length === 0) {
            toast.info('Nota: Nenhum sócio retornado pela API Zen. A empresa será importada sem sócios.');
        }
        setStep('confirm-socios');
      } else {
        if (socios.length === 0) {
            toast.warning('Nenhum sócio encontrado nesta empresa (Zen). A importação de sócios pode não estar disponível via Zen API.');
            // Allow user to proceed or close?
            // If mode is socio, we can't do much.
            // Maybe offer to continue without socios if in company mode?
            // But here we are in 'else' block which means mode != 'company' (so mode == 'socio')
            // So we should close or show error.
             setOpen(false);
        } else {
            setStep('select-socio');
        }
      }
  };

  const handleSyncSyn = async () => {
      // 1. Fetch Company Data (TnGemDMEmpresa)
      const companyResult = await fetchQuestorData('TnGemDMEmpresa', { CODIGOEMPRESA: companyCode });
      
      // Check for specific Permission/Visibility issue (API returns 200 OK but RegistroCarregado=false)
      if (companyResult.data && companyResult.data.RegistroCarregado === false) {
         throw new Error(`Permissão Negada: A empresa ${companyCode} existe, mas o Token da API não tem permissão para visualizá-la. Verifique as configurações de usuário/web no Questor.`);
      }

      let companyData = null;
      if (Array.isArray(companyResult.data)) {
        companyData = companyResult.data[0];
      } else if (companyResult.data && (companyResult.data.RegistroCarregado === true || companyResult.data.RegistroCarregado === undefined)) {
        // Handle single object response
        companyData = companyResult.data;
      }

      // Fallback: Try Fetching Establishment 1 if Company fetch fails (sometimes TnGemDMEmpresa is restricted or fails)
      if (!companyData) {
        console.log('Company fetch failed, trying Establishment 1...');
        try {
          const estabResultFallback = await fetchQuestorData('TnGemDMEstab', { 
            CODIGOEMPRESA: companyCode,
            CODIGOESTAB: '1' 
          });
          
          // Check for permission issue on Fallback too
          if (estabResultFallback.data && estabResultFallback.data.RegistroCarregado === false) {
             throw new Error(`Permissão Negada (Filial): A empresa ${companyCode} existe, mas o Token da API não tem permissão para visualizá-la.`);
          }

          const estabDataFallback = Array.isArray(estabResultFallback.data) ? estabResultFallback.data[0] : estabResultFallback.data;
          
          // Check if data is actually loaded (Questor specific check)
          if (estabDataFallback && (estabDataFallback.RegistroCarregado === true || estabDataFallback.RegistroCarregado === undefined)) {
            // Construct company data from establishment data
            companyData = {
              CODIGOEMPRESA: estabDataFallback.CODIGOEMPRESA,
              NOME: estabDataFallback.NOMEESTAB, // Usually main estab name is company name
              RAZAOSOCIAL: estabDataFallback.NOMEESTAB,
              INSCRFEDERAL: estabDataFallback.INSCRFEDERAL, // CNPJ
              // Add other fields if needed
            };
          }
        } catch (err: any) {
          console.warn('Fallback fetch failed:', err);
          // If it was our explicit permission error, rethrow it
          if (err.message && err.message.includes('Permissão Negada')) throw err;
        }
      }

      if (!companyData) {
         throw new Error(`Empresa não encontrada na API do Questor (Cód: ${companyCode}).\nVerifique se o código está correto e se a empresa está ativa para o usuário da API.`);
      }

      // 2. Fetch Establishment Data (TnGemDMEstab) - Usually Estab 1 is main
      // If we already fetched it in fallback, use it
      let estabData = null;
      
      const estabResult = await fetchQuestorData('TnGemDMEstab', { CODIGOEMPRESA: companyCode });
      const rawEstabData = Array.isArray(estabResult.data) ? estabResult.data : [estabResult.data];
      
      estabData = rawEstabData.find((e: any) => e && (e.CODIGOESTAB == 1 || e.CODIGOESTAB == '1'));
      if (!estabData && rawEstabData.length > 0 && rawEstabData[0]) estabData = rawEstabData[0];

      // If still no estabData but we have companyData (from original fetch), try to use what we can
      if (!estabData && companyData) {
         // Try to fetch again with explicit CODIGOESTAB=1 if the list failed
         const estabResultExplicit = await fetchQuestorData('TnGemDMEstab', { 
            CODIGOEMPRESA: companyCode,
            CODIGOESTAB: '1' 
         });
         estabData = Array.isArray(estabResultExplicit.data) ? estabResultExplicit.data[0] : estabResultExplicit.data;
      }

      const data = {
        company: companyData,
        estab: estabData || {} // Allow empty estab if strictly company import? But address comes from estab.
      };

      setFetchedData(data);

      if (mode === 'company') {
        // Ask for partners
        setStep('confirm-socios');
      } else {
        // Direct to partners fetch if in socio mode
        await fetchSociosSyn(data);
      }
  };

  const fetchSociosSyn = async (currentData: any) => {
    // ... logic for SYN socios fetching ...
    // Reuse existing logic but extracted
    setLoading(true);
    try {
      const sociosResult = await fetchQuestorData('TnGemDMSocio', { CODIGOEMPRESA: companyCode });
      
      if (sociosResult.error) {
        console.warn('Erro ao buscar sócios:', sociosResult.error);
        toast.warning(`Não foi possível buscar os sócios: ${sociosResult.error}`);
      }

      let sociosList: any[] = [];
      
      if (sociosResult.data && sociosResult.data.RegistroCarregado === false) {
          console.warn('Permissão Negada para Sócios (RegistroCarregado=false)');
      }

      if (Array.isArray(sociosResult.data)) {
        sociosList = sociosResult.data;
      } else if (sociosResult.data && (sociosResult.data.RegistroCarregado === true || sociosResult.data.RegistroCarregado === undefined)) {
        sociosList = [sociosResult.data];
      }
      
      const newData = {
        ...currentData,
        socios: sociosList
      };

      setFetchedData(newData);
      
      if (mode === 'company') {
        onImport(newData);
        if (sociosList.length > 0) {
            toast.success(`Empresa e ${sociosList.length} sócio(s) importados com sucesso!`);
        } else {
            toast.success('Empresa importada com sucesso! (Nenhum sócio encontrado)');
        }
        setOpen(false);
      } else {
        if (newData.socios.length === 0) {
            toast.warning('Nenhum sócio encontrado para esta empresa.');
            setOpen(false);
        } else {
            setStep('select-socio');
        }
      }

    } catch (error: any) {
      toast.error(error.message || 'Erro ao buscar sócios.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSocios = async () => {
    if (source === 'zen') {
        // Zen already fetched everything in one go (usually)
        // If socios are optional in Zen flow, we just use what we have
        // Or if we need to fetch them separately in Zen, we would do it here.
        // Assuming Zen returns everything for now.
        
        if (!importSocios) {
            // Remove socios from data if user unchecked
            const dataWithoutSocios = { ...fetchedData, socios: [] };
            onImport(dataWithoutSocios);
        } else {
            onImport(fetchedData);
        }
        toast.success('Dados importados via Questor Zen!');
        setOpen(false);
    } else {
        // SYN flow
        if (importSocios) {
            await fetchSociosSyn(fetchedData);
        } else {
            onImport(fetchedData);
            toast.success('Dados da empresa importados!');
            setOpen(false);
        }
    }
  };

  // ... rest of component ...


  const handleSelectSocio = () => {
    if (selectedSocioIndex === null || !fetchedData?.socios) return;
    
    const selectedSocio = fetchedData.socios[selectedSocioIndex];
    onImport({
        company: fetchedData.company,
        estab: fetchedData.estab,
        socio: selectedSocio // Return single selected socio
    });
    toast.success('Dados do sócio importados!');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {mode === 'company' ? 'Questor SYN' : 'Importar do Questor'}
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
              <div className="flex justify-center mb-4">
                 <Tabs value={source} onValueChange={(v) => setSource(v as 'zen' | 'syn')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="zen">Questor Zen (Recomendado)</TabsTrigger>
                        <TabsTrigger value="syn">nWeb (Legacy)</TabsTrigger>
                    </TabsList>
                 </Tabs>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="company-code" className="text-right">
                  {source === 'zen' ? 'CNPJ' : 'Cód. Empresa'}
                </Label>
                <div className="col-span-3">
                  <Input
                    id="company-code"
                    value={companyCode}
                    onChange={(e) => {
                        let val = e.target.value;
                        if (source === 'zen') {
                            // Restrict to numbers only for Zen (CNPJ)
                            val = val.replace(/\D/g, '');
                        }
                        setCompanyCode(val);
                    }}
                    placeholder={source === 'zen' ? "Ex: 12345678000199 (Apenas Números)" : "Ex: 123"}
                    onKeyDown={(e) => e.key === 'Enter' && handleSync()}
                    maxLength={source === 'zen' ? 14 : undefined}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center px-4">
                 {source === 'zen' 
                    ? 'Busca dados no Gerenciador de Empresas (Zen) via API. É obrigatório informar o CNPJ.' 
                    : 'Busca dados diretamente no Questor SYN/nWeb (requer permissão de usuário).'}
              </p>
            </div>
          )}

          {step === 'confirm-socios' && fetchedData && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm font-medium">Empresa encontrada:</p>
                <p className="text-lg font-bold">{fetchedData.company.NOME || fetchedData.company.RAZAOSOCIAL}</p>
                <p className="text-sm text-muted-foreground">CNPJ: {fetchedData.company.INSCRFEDERAL || fetchedData.company.CNPJ}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="import-socios" 
                  checked={importSocios} 
                  onCheckedChange={(c) => setImportSocios(!!c)} 
                />
                <Label htmlFor="import-socios">Importar também os sócios vinculados?</Label>
              </div>
            </div>
          )}

          {step === 'select-socio' && fetchedData?.socios && (
            <div className="space-y-4">
               <div className="rounded-md bg-muted p-4 mb-4">
                <p className="text-sm font-medium">Empresa:</p>
                <p className="text-base">{fetchedData.company.NOME || fetchedData.company.RAZAOSOCIAL}</p>
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
