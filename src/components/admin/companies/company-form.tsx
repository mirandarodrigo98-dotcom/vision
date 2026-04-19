
'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createCompany, updateCompany } from '@/app/actions/companies';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { validateCNPJ, validateCPF } from '@/lib/validators';
import { parseQuestorNumber, extractQuestorField } from '@/lib/utils';
import { CompanyDataTab } from './tabs/CompanyDataTab';
import { LegalRepresentativeTab } from './tabs/LegalRepresentativeTab';
import { ContactsTab } from './tabs/ContactsTab';
import { QuestorImportDialog } from './questor-import-dialog';

interface Company {
  id: string;
  nome: string;
  razao_social: string;
  cnpj: string;
  code: string | null;
  filial: string | null;
  municipio: string | null;
  uf: string | null;
  data_abertura: string | null;
  data_nascimento?: string | null;
  telefone: string;
  email_contato: string;
  address_type: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_zip_code: string | null;
  address_neighborhood: string | null;
  is_active: number;
  capital_social_centavos?: number | null;
}

interface CompanySocioForm {
  id: number;
  socioId?: string;
  nome: string;
  cpf: string;
  participacao: number;
  is_representative: boolean;
  data_nascimento?: Date;
  rg?: string;
  cnh?: string;
  cep?: string;
  logradouro_tipo?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
}

interface CompanyFormProps {
  company?: Company | null;
  hasLinkedRecords?: boolean;
  initialSocios?: {
    id: string;
    cpf: string;
    nome: string;
    data_nascimento?: string | null;
    rg?: string | null;
    cnh?: string | null;
    participacao_percent: number;
    cep?: string | null;
    logradouro_tipo?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    municipio?: string | null;
    uf?: string | null;
    is_representative?: boolean;
  }[];
}

export function CompanyForm({ company, hasLinkedRecords = false, initialSocios = [] }: CompanyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // State for CompanyDataTab
  const [cnpjValue, setCnpjValue] = useState(company?.cnpj || '');
  const [cnpjError, setCnpjError] = useState('');
  const [cepValue, setCepValue] = useState(company?.address_zip_code || '');
  const [cepLoading, setCepLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(
    company?.data_abertura ? new Date(company.data_abertura + 'T12:00:00') : undefined
  );
  const [dataNascimento, setDataNascimento] = useState<Date | undefined>(
    company?.data_nascimento ? new Date(company.data_nascimento + 'T12:00:00') : undefined
  );
  
  // Refs for address auto-fill
  const typeRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);
  const complementRef = useRef<HTMLInputElement>(null);
  const neighborhoodRef = useRef<HTMLInputElement>(null);
  const municipalityRef = useRef<HTMLInputElement>(null);
  const ufRef = useRef<HTMLInputElement>(null);

  // State for LegalRepresentativeTab
  const [socios, setSocios] = useState<CompanySocioForm[]>(() =>
    initialSocios.map((s, index) => ({
      id: index,
      socioId: s.id, // ID from DB if exists
      nome: s.nome || '',
      cpf: s.cpf || '',
      data_nascimento: s.data_nascimento ? new Date(s.data_nascimento + 'T12:00:00') : undefined,
      rg: s.rg || '',
      cnh: s.cnh || '',
      participacao: typeof s.participacao_percent === 'number'
        ? s.participacao_percent
        : Number(s.participacao_percent || 0),
      is_representative: s.is_representative || false,
      cep: s.cep || '',
      logradouro_tipo: s.logradouro_tipo || '',
      logradouro: s.logradouro || '',
      numero: s.numero || '',
      complemento: s.complemento || '',
      bairro: s.bairro || '',
      municipio: s.municipio || '',
      uf: s.uf || '',
    }))
  );

  const totalParticipacao = useMemo(() => {
    const total = socios.reduce((sum, socio) => sum + (socio.participacao || 0), 0);
    return Math.round(total * 100) / 100;
  }, [socios]);

  // Handlers for CompanyDataTab
  
   const [mergedCompany, setMergedCompany] = useState<Company | null | undefined>(company);
   const [formKey, setFormKey] = useState(0);
 
   const onImport = (data: any) => {
    console.log('--- ON IMPORT DEBUG ---', data);
    
    // Merge data into a temporary company object
    // Support both Legacy (estab/company keys) and New (address/company keys) formats
    const c = data.company || {};
    const e = data.estab || {}; 
    const a = data.address || {}; // Direct address object if present

    console.log('Company Data:', c);
    console.log('Address Data:', a);

    // Helper to find field in any object
    const find = (keys: string[]) => {
        const val = extractQuestorField(e, keys) || extractQuestorField(c, keys) || extractQuestorField(a, keys);
        return val || '';
    };
    
    // Capital Social
    // Check multiple possible keys for capital social
    const cap = extractQuestorField(c, ['CAPITALSOCIAL', 'capital_social', 'VALOR_CAPITAL', 'VL_CAPITAL_SOCIAL', 'capital']) || 
                extractQuestorField(e, ['CAPITALSOCIAL', 'capital_social', 'VALOR_CAPITAL', 'VL_CAPITAL_SOCIAL']);
                
    const capCentavos = cap ? Math.round(parseQuestorNumber(cap) * 100) : mergedCompany?.capital_social_centavos;
    console.log('Capital Raw:', cap, 'Centavos:', capCentavos);

    // Address Type
    const addressType = extractQuestorField(a, ['tipo_logradouro', 'TIPOLOGRADOURO', 'TIPO', 'DS_TIPO_LOGRADOURO']) || 
                        find(['TIPOLOGRADOURO', 'DESCRTIPOLOGRAD', 'DS_TIPO_LOGRADOURO', 'tipo_logradouro', 'TIPO_LOGRADOURO', 'DS_LOGRADOURO_TIPO', 'TIPO']);
    console.log('Address Type Raw:', addressType);

    const newCompany: any = {
      ...mergedCompany,
      id: mergedCompany?.id || '', // Preserve ID if exists
      razao_social: find(['NOMEESTABCOMPLETO', 'NOME_ESTAB_COMPLETO', 'NOME', 'RAZAOSOCIAL', 'razao_social', 'NM_RAZAO_SOCIAL']) || mergedCompany?.razao_social || '',
      nome: find(['NOMEFANTASIA', 'FANTASIA', 'name', 'nome', 'NM_FANTASIA']) || mergedCompany?.nome || '',
      cnpj: find(['INSCRFEDERAL', 'CNPJ', 'cnpj', 'NR_CNPJ']) || mergedCompany?.cnpj || '',
      code: find(['CODIGOEMPRESA', 'code', 'CD_EMPRESA']) || mergedCompany?.code || '',
      filial: find(['CODIGOESTAB', 'filial', 'CD_FILIAL']) || mergedCompany?.filial || '',
      data_abertura: find(['DATAINICIOATIV', 'data_abertura', 'DT_ABERTURA']) || mergedCompany?.data_abertura || '',
      capital_social_centavos: capCentavos,
      
      // Address
      address_type: addressType || mergedCompany?.address_type || '',
      address_street: extractQuestorField(a, ['logradouro', 'LOGRADOURO', 'ENDERECO', 'NM_LOGRADOURO']) || find(['ENDERECO', 'LOGRADOURO', 'NOME_LOGRADOURO', 'DS_LOGRADOURO', 'logradouro', 'RUA', 'NM_LOGRADOURO']) || mergedCompany?.address_street || '',
      address_number: extractQuestorField(a, ['numero', 'NUMERO', 'NR_ENDERECO']) || find(['NUMERO', 'NUM', 'NR_ENDERECO', 'NUMEROENDERECO', 'NUMEROEND', 'NR_IMOVEL', 'NRO', 'numero', 'NR_LOGRADOURO']) || mergedCompany?.address_number || '',
      address_complement: extractQuestorField(a, ['complemento', 'COMPLEMENTO', 'DS_COMPLEMENTO']) || find(['COMPLEMENTO', 'COMPL', 'DS_COMPLEMENTO', 'COMPLEMENTOENDERECO', 'CPL', 'complemento', 'DS_COMPLEMENTO_LOGRADOURO']) || mergedCompany?.address_complement || '',
      address_neighborhood: extractQuestorField(a, ['bairro', 'BAIRRO', 'NM_BAIRRO']) || find(['BAIRRO', 'NM_BAIRRO', 'NOMEBAIRRO', 'DESCRBAIRRO', 'BAIRROEND', 'DS_BAIRRO', 'NO_BAIRRO', 'bairro', 'NM_BAIRRO_LOGRADOURO']) || mergedCompany?.address_neighborhood || '',
      address_zip_code: extractQuestorField(a, ['cep', 'CEP', 'NR_CEP']) || find(['CEP', 'NR_CEP', 'CEPEND', 'CODIGO_POSTAL', 'ZIP', 'cep', 'NR_CEP_LOGRADOURO']) || mergedCompany?.address_zip_code || '',
      municipio: extractQuestorField(a, ['cidade', 'CIDADE', 'MUNICIPIO', 'NM_CIDADE']) || find(['NOMEMUNIC', 'CIDADE', 'MUNICIPIO', 'NM_CIDADE', 'NOMEMUNICIPIO', 'CIDADEEND', 'DS_CIDADE', 'municipio', 'NM_MUNICIPIO']) || mergedCompany?.municipio || '',
      uf: extractQuestorField(a, ['uf', 'UF', 'ESTADO', 'SG_UF']) || find(['SIGLAESTADO', 'UF', 'ESTADO', 'SG_UF', 'SIGLAUF', 'UFEND', 'uf', 'SG_ESTADO']) || mergedCompany?.uf || '',
      
      // Contact
      telefone: find(['TELEFONE', 'telefone', 'NR_TELEFONE', 'FONE']) || mergedCompany?.telefone || '',
      email_contato: find(['EMAIL', 'email', 'DS_EMAIL', 'EMAIL_CONTATO']) || mergedCompany?.email_contato || '',
    };
    
    setMergedCompany(newCompany);
    console.log('New Merged Company State:', newCompany);
     
     // Update individual states
     if (newCompany.cnpj) {
         let val = newCompany.cnpj.replace(/\D/g, '');
         if (val.length === 14) val = val.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
         setCnpjValue(val);
     }
     if (newCompany.address_zip_code) {
         let val = newCompany.address_zip_code.replace(/\D/g, '');
         if (val.length === 8) val = val.replace(/^(\d{5})(\d{3})/, '$1-$2');
         setCepValue(val);
     }
     if (newCompany.data_abertura) {
         setDate(new Date(newCompany.data_abertura));
     }
 
     // Update Socios
    if (data.socios && Array.isArray(data.socios)) {
      const newSocios = data.socios.map((s: any, index: number) => {
        const importedCpf = (s.CPF || '').replace(/\D/g, '');
        const existingSocio = socios.find(es => es.cpf.replace(/\D/g, '') === importedCpf);

        return {
          id: index, // Temporary ID
          nome: s.NOME || '',
          cpf: s.CPF || '', 
          participacao: parseFloat(s.PERCENTUALPARTICIPACAO || s.PARTICIPACAO || '0'),
          is_representative: existingSocio ? existingSocio.is_representative : false, // Preserve existing status
          data_nascimento: s.DATANASCIMENTO ? new Date(s.DATANASCIMENTO) : undefined,
          rg: s.RG || '',
          orgao_expedidor: s.ORGAOEXPEDIDOR || '', 
          uf_orgao_expedidor: s.UFORGAOEXPEDIDOR || '', 
          data_expedicao: s.DATAEXPEDICAO ? new Date(s.DATAEXPEDICAO) : undefined,
          // Address for socio
          cep: s.CEP || '',
          logradouro: s.ENDERECO || s.LOGRADOURO || '',
          numero: s.NUMERO || '',
          complemento: s.COMPLEMENTO || '',
          bairro: s.BAIRRO || '',
          municipio: s.NOMEMUNIC || '',
          uf: s.SIGLAESTADO || '',
        };
      });
      setSocios(newSocios);
    }
 
     setFormKey(prev => prev + 1); // Force re-render of tabs
     toast.success('Dados importados com sucesso!');
   };
 
   const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);

    if (value.length <= 11) {
      // CPF Mask
      if (value.length > 9) value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
      else if (value.length > 6) value = value.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
      else if (value.length > 3) value = value.replace(/^(\d{3})(\d{0,3})/, '$1.$2');
    } else {
      // CNPJ Mask
      if (value.length > 12) value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      else if (value.length > 8) value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
      else value = value.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
    }
    
    setCnpjValue(value);
    if (cnpjError) setCnpjError('');
  };

  const handleCnpjBlur = () => {
    if (cnpjValue.length > 0) {
      const cleanValue = cnpjValue.replace(/\D/g, '');
      let isValid = false;
      if (cleanValue.length === 11) {
         isValid = validateCPF(cleanValue);
      } else if (cleanValue.length === 14) {
         isValid = validateCNPJ(cleanValue);
      }
      
      if (!isValid) setCnpjError('CNPJ/CPF inválido');
      else setCnpjError('');
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) value = value.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
    setCepValue(value);
  };

  const lookupCep = async () => {
    const digits = cepValue.replace(/\D/g, '');
    if (digits.length !== 8) {
      toast.error('CEP inválido (precisa ter 8 dígitos)');
      return;
    }
    try {
      setCepLoading(true);
      const res = await fetch(`/api/cep?cep=${digits}`);
      const data = await res.json();
      if (data && !data.error) {
        if (typeRef.current) typeRef.current.value = data.tipo || '';
        if (streetRef.current) streetRef.current.value = data.nome ? `${data.tipo ? data.tipo + ' ' : ''}${data.nome}` : (data.logradouro || '');
        if (complementRef.current) complementRef.current.value = data.complemento || '';
        if (neighborhoodRef.current) neighborhoodRef.current.value = data.bairro || '';
        if (municipalityRef.current) municipalityRef.current.value = data.localidade || '';
        if (ufRef.current) ufRef.current.value = data.uf || '';
        toast.success('Endereço preenchido pelo CEP');
      } else {
        toast.error(data?.error || 'CEP não encontrado');
      }
    } catch (err) {
      toast.error('Falha ao buscar CEP');
    } finally {
      setCepLoading(false);
    }
  };

  async function handleSubmit(formData: FormData) {
    if (cnpjValue) {
      const cleanValue = cnpjValue.replace(/\D/g, '');
      let isValid = false;
      if (cleanValue.length === 11) isValid = validateCPF(cleanValue);
      else if (cleanValue.length === 14) isValid = validateCNPJ(cleanValue);

      if (!isValid) {
        setCnpjError('CNPJ/CPF inválido');
        toast.error('CNPJ/CPF inválido. Verifique o número digitado.');
        return;
      }
    }

    if (socios.length > 0 && totalParticipacao !== 100) {
      toast.error('O total das participações dos sócios deve ser exatamente 100%.');
      return;
    }

    setLoading(true);
    let res;
    
    if (company) {
      if (hasLinkedRecords) {
        formData.set('code', company.code || '');
        formData.set('cnpj', company.cnpj);
      }
      res = await updateCompany(company.id, formData);
    } else {
      res = await createCompany(formData);
    }

    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(company ? 'Empresa atualizada!' : 'Empresa criada!');
      if (!company) {
          // If created, redirect to list or stay to add contacts?
          // Usually redirect.
          router.push('/admin/clients');
      } else {
          router.refresh();
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{company ? 'Editar Empresa' : 'Nova Empresa'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit}>
          <Tabs defaultValue="dados" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="responsavel">Responsável Legal</TabsTrigger>
                <TabsTrigger value="contatos">Contatos</TabsTrigger>
              </TabsList>
              
              {!company && (
                <QuestorImportDialog 
                  mode="company" 
                  onImport={onImport} 
                />
              )}
            </div>
            
            <TabsContent value="dados" key={formKey}>
              <CompanyDataTab 
                company={mergedCompany}
                hasLinkedRecords={hasLinkedRecords}
                cnpjValue={cnpjValue}
                setCnpjValue={setCnpjValue}
                cnpjError={cnpjError}
                handleCnpjChange={handleCnpjChange}
                handleCnpjBlur={handleCnpjBlur}
              date={date}
              setDate={setDate}
              dataNascimento={dataNascimento}
              setDataNascimento={setDataNascimento}
              typeRef={typeRef}
                streetRef={streetRef}
                complementRef={complementRef}
                neighborhoodRef={neighborhoodRef}
                municipalityRef={municipalityRef}
                ufRef={ufRef}
                cepValue={cepValue}
                setCepValue={setCepValue}
                handleCepChange={handleCepChange}
                lookupCep={lookupCep}
                cepLoading={cepLoading}
              />
            </TabsContent>
            
            <TabsContent value="responsavel">
              <LegalRepresentativeTab 
                socios={socios} 
                setSocios={setSocios} 
                totalParticipacao={totalParticipacao} 
              />
            </TabsContent>
            
            <TabsContent value="contatos">
              <ContactsTab companyId={company?.id} />
            </TabsContent>

            <div className="flex justify-end gap-4 mt-6">
                <Button type="submit" disabled={loading}>
                    {loading && <span className="animate-spin mr-2">⏳</span>}
                    Salvar
                </Button>
            </div>
          </Tabs>
        </form>
      </CardContent>
    </Card>
  );
}
