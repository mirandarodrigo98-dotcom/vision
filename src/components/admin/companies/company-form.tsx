'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCompany, updateCompany } from '@/app/actions/companies';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { validateCNPJ, validateCPF } from '@/lib/validators';
import { findSocioByCpf } from '@/app/actions/societario';

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
  nome: string;
  cpf: string;
  data_nascimento?: Date;
  rg: string;
  cnh: string;
  participacao: number;
  cep: string;
  logradouro_tipo: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
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
  }[];
}

export function CompanyForm({ company, hasLinkedRecords = false, initialSocios = [] }: CompanyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cnpjValue, setCnpjValue] = useState(company?.cnpj || '');
  const [cnpjError, setCnpjError] = useState('');
  const [cepValue, setCepValue] = useState(company?.address_zip_code || '');
  const [cepLoading, setCepLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(
    company?.data_abertura ? new Date(company.data_abertura + 'T12:00:00') : undefined
  );
  const typeRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);
  const complementRef = useRef<HTMLInputElement>(null);
  const neighborhoodRef = useRef<HTMLInputElement>(null);
  const municipalityRef = useRef<HTMLInputElement>(null);
  const ufRef = useRef<HTMLInputElement>(null);
  const capitalHiddenRef = useRef<HTMLInputElement>(null);

  const [socios, setSocios] = useState<CompanySocioForm[]>(() =>
    initialSocios.map((s, index) => ({
      id: index,
      nome: s.nome || '',
      cpf: s.cpf || '',
      data_nascimento: s.data_nascimento ? new Date(s.data_nascimento + 'T12:00:00') : undefined,
      rg: s.rg || '',
      cnh: s.cnh || '',
      participacao: typeof s.participacao_percent === 'number'
        ? s.participacao_percent
        : Number(s.participacao_percent || 0),
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
  const [nextSocioId, setNextSocioId] = useState(initialSocios.length);

  const [currentSocioNome, setCurrentSocioNome] = useState('');
  const [currentSocioBirthDate, setCurrentSocioBirthDate] = useState<Date | undefined>(undefined);
  const [currentSocioCpf, setCurrentSocioCpf] = useState('');
  const [currentSocioRg, setCurrentSocioRg] = useState('');
  const [currentSocioCnh, setCurrentSocioCnh] = useState('');
  const [currentSocioParticipacaoDisplay, setCurrentSocioParticipacaoDisplay] = useState('');
  const [currentSocioParticipacao, setCurrentSocioParticipacao] = useState(0);
  const [currentSocioCep, setCurrentSocioCep] = useState('');
  const [currentSocioLogradouroTipo, setCurrentSocioLogradouroTipo] = useState('');
  const [currentSocioLogradouro, setCurrentSocioLogradouro] = useState('');
  const [currentSocioNumero, setCurrentSocioNumero] = useState('');
  const [currentSocioComplemento, setCurrentSocioComplemento] = useState('');
  const [currentSocioBairro, setCurrentSocioBairro] = useState('');
  const [currentSocioMunicipio, setCurrentSocioMunicipio] = useState('');
  const [currentSocioUf, setCurrentSocioUf] = useState('');
  const [socioCepLoading, setSocioCepLoading] = useState(false);
  const [cpfSocioError, setCpfSocioError] = useState('');

  const totalParticipacao = useMemo(() => {
    const total = socios.reduce((sum, socio) => sum + (socio.participacao || 0), 0);
    return Math.round(total * 100) / 100;
  }, [socios]);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleSocioParticipacaoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      setCurrentSocioParticipacaoDisplay('');
      setCurrentSocioParticipacao(0);
      return;
    }
    const limited = digits.slice(0, 5);
    const intPart = limited.slice(0, Math.max(limited.length - 2, 0)) || '0';
    const decPart = limited.slice(-2).padStart(2, '0');
    let intNum = parseInt(intPart, 10);
    if (isNaN(intNum)) intNum = 0;
    if (intNum > 100) intNum = 100;
    let decNum = parseInt(decPart, 10);
    if (isNaN(decNum)) decNum = 0;
    if (intNum === 100) decNum = 0;
    const formattedDisplay = `${intNum.toString()},${decNum.toString().padStart(2, '0')}`;
    setCurrentSocioParticipacaoDisplay(formattedDisplay);
    const numeric = intNum + decNum / 100;
    setCurrentSocioParticipacao(numeric);
  };

  const handleSocioCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 5) v = v.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
    setCurrentSocioCep(v);
  };

  const lookupSocioCep = async () => {
    const digits = currentSocioCep.replace(/\D/g, '');
    if (digits.length !== 8) {
      toast.error('CEP inválido (precisa ter 8 dígitos)');
      return;
    }
    try {
      setSocioCepLoading(true);
      const res = await fetch(`/api/cep?cep=${digits}`);
      const data = await res.json();
      if (data && !data.error) {
        const tipo = data.tipo || '';
        const nome = data.nome || '';
        setCurrentSocioLogradouroTipo(tipo);
        setCurrentSocioLogradouro(nome || data.logradouro || '');
        setCurrentSocioBairro(data.bairro || '');
        setCurrentSocioMunicipio(data.localidade || '');
        setCurrentSocioUf(data.uf || '');
        setCurrentSocioComplemento(data.complemento || '');
        toast.success('Endereço do sócio preenchido pelo CEP');
      } else {
        toast.error(data?.error || 'CEP não encontrado');
      }
    } catch (err) {
      toast.error('Falha ao buscar CEP do sócio');
    } finally {
      setSocioCepLoading(false);
    }
  };

  const handleRemoveSocio = (id: number) => {
    setSocios((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSocioCpfBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    if (!value) {
      setCpfSocioError('');
      return;
    }
    const isValid = validateCPF(value);
    if (!isValid) {
      setCpfSocioError('CPF inválido');
      toast.error('CPF inválido');
      return;
    }
    setCpfSocioError('');
    try {
      const socio = await findSocioByCpf(value);
      if (socio) {
        setCurrentSocioNome((socio.nome || '').toUpperCase());
        setCurrentSocioBirthDate(
          socio.data_nascimento ? new Date(socio.data_nascimento + 'T12:00:00') : undefined
        );
        setCurrentSocioRg(socio.rg || '');
        setCurrentSocioCnh(socio.cnh || '');
        setCurrentSocioCep(socio.cep || '');
        setCurrentSocioLogradouroTipo(socio.logradouro_tipo || '');
        setCurrentSocioLogradouro(socio.logradouro || '');
        setCurrentSocioNumero(socio.numero || '');
        setCurrentSocioComplemento(socio.complemento || '');
        setCurrentSocioBairro(socio.bairro || '');
        setCurrentSocioMunicipio(socio.municipio || '');
        setCurrentSocioUf(socio.uf || '');
        toast.success('Dados do sócio preenchidos a partir do CPF cadastrado.');
      }
    } catch {
      toast.error('Erro ao buscar dados do sócio pelo CPF.');
    }
  };

  const handleAddSocio = () => {
    if (!currentSocioNome.trim()) {
      toast.error('Informe o nome do sócio');
      return;
    }
    if (!currentSocioCpf || !validateCPF(currentSocioCpf)) {
      toast.error('CPF inválido');
      return;
    }
    const currentDigits = currentSocioCpf.replace(/\D/g, '');
    const existsInList = socios.some((s) => s.cpf.replace(/\D/g, '') === currentDigits);
    if (existsInList) {
      toast.error('CPF já incluído na lista de sócios desta empresa');
      return;
    }
    if (!currentSocioParticipacao || currentSocioParticipacao <= 0) {
      toast.error('Informe a participação do sócio');
      return;
    }
    const novoTotal = totalParticipacao + currentSocioParticipacao;
    if (novoTotal > 100) {
      toast.error('O total das participações não pode ultrapassar 100%');
      return;
    }
    const novoId = nextSocioId;
    setSocios((prev) => [
      ...prev,
      {
        id: novoId,
        nome: currentSocioNome,
        cpf: currentSocioCpf,
        data_nascimento: currentSocioBirthDate,
        rg: currentSocioRg,
        cnh: currentSocioCnh,
        participacao: currentSocioParticipacao,
        cep: currentSocioCep,
        logradouro_tipo: currentSocioLogradouroTipo,
        logradouro: currentSocioLogradouro,
        numero: currentSocioNumero,
        complemento: currentSocioComplemento,
        bairro: currentSocioBairro,
        municipio: currentSocioMunicipio,
        uf: currentSocioUf,
      },
    ]);
    setNextSocioId((prev) => prev + 1);
    setCurrentSocioNome('');
    setCurrentSocioCpf('');
    setCurrentSocioBirthDate(undefined);
    setCurrentSocioRg('');
    setCurrentSocioCnh('');
    setCurrentSocioParticipacaoDisplay('');
    setCurrentSocioParticipacao(0);
    setCurrentSocioCep('');
    setCurrentSocioLogradouroTipo('');
    setCurrentSocioLogradouro('');
    setCurrentSocioNumero('');
    setCurrentSocioComplemento('');
    setCurrentSocioBairro('');
    setCurrentSocioMunicipio('');
    setCurrentSocioUf('');
    setCpfSocioError('');
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    
    // Mask: 00.000.000/0000-00
    if (value.length > 12) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    } else if (value.length > 8) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
    } else if (value.length > 5) {
      value = value.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
    }
    
    setCnpjValue(value);
    if (cnpjError) setCnpjError('');
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    
    // Mask: 00000-000
    if (value.length > 5) {
      value = value.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
    }
    
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

  const handleCnpjBlur = () => {
    if (cnpjValue.length > 0) {
      const isValid = validateCNPJ(cnpjValue);
      if (!isValid) {
        setCnpjError('CNPJ inválido');
      } else {
        setCnpjError('');
      }
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
      // If fields are disabled, they are not sent in FormData. 
      // We must append them manually if they are missing, OR the server action handles missing fields by not updating them.
      // However, server action validation requires 'code'.
      // If disabled, we should append the original values so validation passes, 
      // OR update the server action to respect the 'disabled' state logic (which we already did partly).
      
      // Better approach: If hasLinkedRecords, we manually append the original code/cnpj to formData 
      // because disabled inputs are NOT submitted.
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
      router.push('/admin/clients');
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{company ? 'Editar Empresa' : 'Nova Empresa'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {/* Código */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Código *</label>
            <div className="space-y-1">
              <Input 
                name="code" 
                defaultValue={company?.code || ''} 
                required 
                placeholder="Ex: 1"
                disabled={hasLinkedRecords}
                className="w-[10ch]"
              />
              {hasLinkedRecords ? (
                <p className="text-xs text-yellow-600">Código não pode ser alterado pois existem registros vinculados.</p>
              ) : (
                <p className="text-xs text-muted-foreground">O código deve ser único para cada empresa.</p>
              )}
            </div>
          </div>

          {/* Filial */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Filial</label>
            <Input name="filial" defaultValue={company?.filial || ''} className="w-[8ch]" />
          </div>

          {/* CNPJ */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">CNPJ *</label>
            <div className="space-y-1">
              <Input 
                name="cnpj" 
                value={cnpjValue} 
                onChange={handleCnpjChange}
                onBlur={handleCnpjBlur}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                required 
                className={`w-[22ch] ${cnpjError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                disabled={hasLinkedRecords}
              />
              {hasLinkedRecords && <p className="text-xs text-yellow-600 mt-1">CNPJ não pode ser alterado pois existem registros vinculados.</p>}
              {cnpjError && <p className="text-xs text-red-500 mt-1">{cnpjError}</p>}
            </div>
          </div>

          {/* Data de Abertura */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Data de Abertura</label>
            <div className="w-[18ch]">
              <DatePicker 
                date={date} 
                setDate={setDate} 
                placeholder="Selecione..." 
              />
              <input type="hidden" name="data_abertura" value={date ? format(date, 'yyyy-MM-dd') : ''} />
            </div>
          </div>

          {/* Razão Social */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Razão Social</label>
            <Input name="razao_social" defaultValue={company?.razao_social} className="w-[80ch]" />
          </div>

          {/* Nome Fantasia */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Nome Fantasia *</label>
            <Input name="nome" defaultValue={company?.nome} required className="w-[20ch]" />
          </div>

          {/* Tipo Logradouro */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Tipo Logradouro</label>
            <Input ref={typeRef} name="address_type" placeholder="Ex: Rua, Av, Alameda" defaultValue={company?.address_type || ''} className="w-[16ch]" />
          </div>

          {/* Logradouro */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Logradouro</label>
            <Input ref={streetRef} name="address_street" defaultValue={company?.address_street || ''} className="w-[80ch]" />
          </div>

          {/* Número */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Número</label>
            <Input name="address_number" defaultValue={company?.address_number || ''} className="w-[12ch]" />
          </div>

          {/* Complemento */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Complemento</label>
            <Input ref={complementRef} name="address_complement" defaultValue={company?.address_complement || ''} className="w-[20ch]" />
          </div>

          {/* Bairro */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Bairro</label>
            <Input ref={neighborhoodRef} name="address_neighborhood" defaultValue={company?.address_neighborhood || ''} className="w-[30ch]" />
          </div>

          {/* Município */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Município</label>
            <Input ref={municipalityRef} name="municipio" defaultValue={company?.municipio || ''} className="w-[50ch]" />
          </div>

          {/* Estado */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Estado</label>
            <Input ref={ufRef} name="uf" maxLength={2} defaultValue={company?.uf || ''} className="w-[8ch]" />
          </div>

          {/* CEP */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">CEP</label>
            <div className="relative w-[15ch]">
              <Input 
                name="address_zip_code" 
                value={cepValue} 
                onChange={handleCepChange}
                placeholder="00000-000"
                maxLength={9}
                className="pr-9"
              />
              <button
                type="button"
                onClick={lookupCep}
                className="absolute right-1 top-1.5 h-7 w-7 inline-flex items-center justify-center rounded border bg-white hover:bg-muted"
                title="Buscar endereço"
                disabled={cepLoading}
              >
                {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* E-mail */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">E-mail</label>
            <Input name="email_contato" type="email" defaultValue={company?.email_contato || ''} className="w-[50ch]" />
          </div>

          {/* Capital Social */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Capital Social (R$)</label>
            <div className="space-y-1">
              <Input
                name="capital_social_display"
                defaultValue={
                  company?.capital_social_centavos != null
                    ? (company.capital_social_centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : ''
                }
                placeholder="0,00"
                onInput={(e) => {
                  const digits = e.currentTarget.value.replace(/\D/g, '');
                  if (!digits) {
                    e.currentTarget.value = '';
                    if (capitalHiddenRef.current) capitalHiddenRef.current.value = '';
                    return;
                  }
                  const intVal = parseInt(digits, 10);
                  const formatted = (intVal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  e.currentTarget.value = formatted;
                  if (capitalHiddenRef.current) capitalHiddenRef.current.value = String(intVal);
                }}
                className="w-[18ch]"
              />
              <input
                type="hidden"
                name="capital_social_centavos"
                ref={capitalHiddenRef}
                defaultValue={
                  company?.capital_social_centavos != null
                    ? String(company.capital_social_centavos)
                    : ''
                }
              />
            </div>
          </div>

          {/* Telefone */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Telefone</label>
            <Input name="telefone" defaultValue={company?.telefone || ''} className="w-[20ch]" />
          </div>

          <div className="space-y-4 border rounded-md p-4">
            <h2 className="text-lg font-semibold">Sócios</h2>
            <p className="text-sm text-muted-foreground">
              O vínculo de sócios é feito no módulo de Sócios. Use este campo apenas para
              pesquisar sócios já vinculados à empresa.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Filtrar sócio vinculado</label>
              <Input
                placeholder="Digite o nome ou CPF do sócio"
                readOnly
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Link href="/admin/clients">
              <Button variant="outline" type="button">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (company ? 'Salvar Alterações' : 'Criar Empresa')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
