
'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createCompany, updateCompany } from '@/app/actions/companies';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { validateCNPJ } from '@/lib/validators';
import { CompanyDataTab } from './tabs/CompanyDataTab';
import { LegalRepresentativeTab } from './tabs/LegalRepresentativeTab';
import { ContactsTab } from './tabs/ContactsTab';

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
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    if (value.length > 12) value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    else if (value.length > 8) value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
    else if (value.length > 5) value = value.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
    else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
    
    setCnpjValue(value);
    if (cnpjError) setCnpjError('');
  };

  const handleCnpjBlur = () => {
    if (cnpjValue.length > 0) {
      const isValid = validateCNPJ(cnpjValue);
      if (!isValid) setCnpjError('CNPJ inválido');
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
    if (cnpjValue && !validateCNPJ(cnpjValue)) {
      setCnpjError('CNPJ inválido');
      toast.error('CNPJ inválido. Verifique o número digitado.');
      return;
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="responsavel">Responsável Legal</TabsTrigger>
              <TabsTrigger value="contatos">Contatos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="dados">
              <CompanyDataTab 
                company={company}
                hasLinkedRecords={hasLinkedRecords}
                cnpjValue={cnpjValue}
                setCnpjValue={setCnpjValue}
                cnpjError={cnpjError}
                handleCnpjChange={handleCnpjChange}
                handleCnpjBlur={handleCnpjBlur}
                date={date}
                setDate={setDate}
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
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
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
