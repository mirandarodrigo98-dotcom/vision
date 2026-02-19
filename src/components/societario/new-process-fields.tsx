'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SocietarioCompanySelector } from '@/components/societario/company-selector';
import { useDebounce } from 'use-debounce';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getCompanyDetailsFull, getCompanySocios } from '@/app/actions/companies';

interface ProcessInitialValues {
  id?: string;
  type?: string;
  company_id?: string;
  razao_social?: string;
  nome_fantasia?: string;
  capital_social_centavos?: number;
  socio_administrador?: string;
  objeto_social?: string;
  telefone?: string;
  email?: string;
  observacao?: string;
  natureza_juridica?: string;
  porte?: string;
  tributacao?: string;
  inscricao_imobiliaria?: string;
  compl_cep?: string;
  compl_logradouro_tipo?: string;
  compl_logradouro?: string;
  compl_numero?: string;
  compl_complemento?: string;
  compl_bairro?: string;
  compl_municipio?: string;
  compl_uf?: string;
  socios?: Array<{
    nome: string;
    cpf: string;
    data_nascimento?: string;
    rg?: string;
    cnh?: string;
    participacao_percent?: number;
    cep?: string;
    logradouro_tipo?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
  }>;
  cnaes?: Array<{ id: string; descricao: string }>;
}

interface NewProcessFieldsProps {
  initialCompanyId?: string;
  initialValues?: ProcessInitialValues;
  readonlyType?: boolean;
}

const NATUREZA_JURIDICA_OPTIONS = [
  '101-5 Órgão Público do Poder Executivo Federal',
  '102-3 Órgão Público do Poder Executivo Estadual ou do Distrito Federal',
  '103-1 Órgão Público do Poder Executivo Municipal',
  '104-0 Órgão Público do Poder Legislativo Federal',
  '105-8 Órgão Público do Poder Legislativo Estadual ou do Distrito Federal',
  '106-6 Órgão Público do Poder Legislativo Municipal',
  '107-4 Órgão Público do Poder Judiciário Federal',
  '108-2 Órgão Público do Poder Judiciário Estadual',
  '110-4 Autarquia Federal',
  '111-2 Autarquia Estadual ou do Distrito Federal',
  '112-0 Autarquia Municipal',
  '113-9 Fundação Federal',
  '114-7 Fundação Estadual ou do Distrito Federal',
  '115-5 Fundação Municipal',
  '116-3 Órgão Público Autônomo da União',
  '117-1 Órgão Público Autônomo Estadual ou do Distrito Federal',
  '118-0 Órgão Público Autônomo Municipal',
  '201-1 Empresa Pública',
  '203-8 Sociedade de Economia Mista',
  '204-6 Sociedade Anônima Aberta',
  '205-4 Sociedade Anônima Fechada',
  '206-2 Sociedade Empresária Limitada',
  '207-6 Sociedade Empresária em Nome Coletivo',
  '208-9 Sociedade Empresária em Comandita Simples',
  '209-7 Sociedade Empresária em Comandita por Ações',
  '210-0 Sociedade Mercantil de Capital e Indústria (extinta pelo NCC/2002)',
  '212-7 Sociedade Empresária em Conta de Participação',
  '213-5 Empresário (Individual)',
  '214-3 Cooperativa',
  '215-1 Consórcio de Sociedades',
  '216-0 Grupo de Sociedades',
  '217-8 Estabelecimento, no Brasil, de Sociedade Estrangeira',
  '219-4 Estabelecimento, no Brasil, de Empresa Binacional Argentino-Brasileira',
  '220-8 Entidade Binacional Itaipu',
  '221-6 Empresa Domiciliada no Exterior',
  '222-4 Clube/Fundo de Investimento',
  '223-2 Sociedade Simples Pura',
  '224-0 Sociedade Simples Limitada',
  '225-9 Sociedade em Nome Coletivo',
  '226-7 Sociedade em Comandita Simples',
  '227-5 Sociedade Simples em Conta de Participação',
  '230-5 Empresa Individual de Responsabilidade Limitada',
  '303-4 Serviço Notarial e Registral (Cartório)',
  '304-2 Organização Social',
  '305-0 Organização da Sociedade Civil de Interesse Público (Oscip)',
  '306-9 Outras Formas de Fundações Mantidas com Recursos Privados',
  '307-7 Serviço Social Autônomo',
  '308-5 Condomínio Edilícios',
  '309-3 Unidade Executora (Programa Dinheiro Direto na Escola)',
  '310-7 Comissão de Conciliação Prévia',
  '311-5 Entidade de Mediação e Arbitragem',
  '312-3 Partido Político',
  '313-1 Entidade Sindical',
  '320-4 Estabelecimento, no Brasil, de Fundação ou Associação Estrangeiras',
  '321-2 Fundação ou Associação Domiciliada no Exterior',
  '399-9 Outras Formas de Associação',
  '401-4 Empresa Individual Imobiliária',
  '402-2 Segurado Especial',
  '408-1 Contribuinte individual',
  '500-2 Organização Internacional e Outras Instituições Extraterritoriais',
];

export function NewProcessFields({ initialCompanyId, initialValues, readonlyType = false }: NewProcessFieldsProps) {
  const [type, setType] = useState<string>(initialValues?.type ?? '');
  const [step, setStep] = useState<number>(1);
  const [socios, setSocios] = useState<Array<{
    id: number;
    nome: string;
    cpf: string;
    data_nascimento?: Date;
    rg?: string;
    cnh?: string;
    participacao: number;
    cep?: string;
    logradouro_tipo?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    municipio?: string;
    uf?: string;
  }>>([]);
  const [nextSocioId, setNextSocioId] = useState<number>(initialValues?.socios ? initialValues.socios.length : 0);
  const [naturezaSearch, setNaturezaSearch] = useState('');
  const [selectedNatureza, setSelectedNatureza] = useState(initialValues?.natureza_juridica || '');
  const [porte, setPorte] = useState(initialValues?.porte || '');
  const [tributacao, setTributacao] = useState(initialValues?.tributacao || '');
  const [cnaeSearch, setCnaeSearch] = useState('');
  const [cnaeResults, setCnaeResults] = useState<{ id: string; descricao: string }[]>([]);
  const [cnaeLoading, setCnaeLoading] = useState(false);
  const [cnaeError, setCnaeError] = useState('');
  const [selectedCnaes, setSelectedCnaes] = useState<
    { id: string; descricao: string; tipo: 'PRINCIPAL' | 'SECUNDARIA' }[]
  >([]);
  const [cnaeTipo, setCnaeTipo] = useState<'PRINCIPAL' | 'SECUNDARIA'>('PRINCIPAL');
  const [debouncedCnaeSearch] = useDebounce(cnaeSearch, 400);
  const [capitalDisplay, setCapitalDisplay] = useState(
    typeof initialValues?.capital_social_centavos === 'number'
      ? (initialValues.capital_social_centavos / 100).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : ''
  );
  const [isTransformacao, setIsTransformacao] = useState<'SIM' | 'NAO' | ''>('');
  const [numeroAlteracao, setNumeroAlteracao] = useState('');
  const [alteracaoQuadroSocietario, setAlteracaoQuadroSocietario] = useState<'SIM' | 'NAO' | ''>('');
  const [alteracaoCapitalSocial, setAlteracaoCapitalSocial] = useState<'SIM' | 'NAO' | ''>('');
  const [novoCapitalDisplay, setNovoCapitalDisplay] = useState('');
  const [alteracaoEnderecoSocio, setAlteracaoEnderecoSocio] = useState<'SIM' | 'NAO' | ''>('');
  const [alteracoesSelecionadas, setAlteracoesSelecionadas] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<{
    id: string;
    razao_social: string;
    cnpj?: string;
  } | null>(null);
  type CompanyDetails = {
    id: string;
    code: string | null;
    razao_social: string | null;
    nome: string | null;
    cnpj: string | null;
    telefone: string | null;
    email_contato: string | null;
    address_type: string | null;
    address_street: string | null;
    address_number: string | null;
    address_complement: string | null;
    address_neighborhood: string | null;
    address_zip_code: string | null;
    municipio: string | null;
    uf: string | null;
    capital_social_centavos: number | null;
  };
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [cepCompl, setCepCompl] = useState(initialValues?.compl_cep || '');
  const [currentSocioNome, setCurrentSocioNome] = useState('');
  const [currentSocioCpf, setCurrentSocioCpf] = useState('');
  const [currentSocioBirthDate, setCurrentSocioBirthDate] = useState<Date | undefined>(undefined);
  const [currentSocioRg, setCurrentSocioRg] = useState('');
  const [currentSocioCnh, setCurrentSocioCnh] = useState('');
  const [currentSocioParticipacaoDisplay, setCurrentSocioParticipacaoDisplay] = useState('');
  const [currentSocioParticipacao, setCurrentSocioParticipacao] = useState<number>(0);
  const [currentSocioCep, setCurrentSocioCep] = useState('');
  const [currentSocioLogradouroTipo, setCurrentSocioLogradouroTipo] = useState('');
  const [currentSocioLogradouro, setCurrentSocioLogradouro] = useState('');
  const [currentSocioNumero, setCurrentSocioNumero] = useState('');
  const [currentSocioComplemento, setCurrentSocioComplemento] = useState('');
  const [currentSocioBairro, setCurrentSocioBairro] = useState('');
  const [currentSocioMunicipio, setCurrentSocioMunicipio] = useState('');
  const [currentSocioUf, setCurrentSocioUf] = useState('');
  const [cpfError, setCpfError] = useState('');
  const [socioCepLoading, setSocioCepLoading] = useState(false);
  const [editingSocioId, setEditingSocioId] = useState<number | null>(null);
  const [currentSocioNatureza, setCurrentSocioNatureza] = useState<'ENTRADA' | 'SAIDA' | 'ALTERACAO' | ''>('');
  const [currentSocioQualificacao, setCurrentSocioQualificacao] = useState<string>('');
  const [currentSocioPais, setCurrentSocioPais] = useState<string>('');
  const complTipoRef = useRef<HTMLInputElement>(null);
  const complLogradouroRef = useRef<HTMLInputElement>(null);
  const complBairroRef = useRef<HTMLInputElement>(null);
  const complMunicipioRef = useRef<HTMLInputElement>(null);
  const complUfRef = useRef<HTMLInputElement>(null);
  const complComplementoRef = useRef<HTMLInputElement>(null);

  const isConstituicao = type === 'CONSTITUICAO';
  const isAlteracao = type === 'ALTERACAO';
  const selectorDisabled = !(type === 'ALTERACAO' || type === 'BAIXA');
  const router = useRouter();
  const canAlterarEnderecoSocio =
    alteracaoQuadroSocietario === 'NAO' && alteracaoCapitalSocial === 'NAO';
  const onlyDadosSocio =
    alteracaoQuadroSocietario === 'NAO' &&
    alteracaoCapitalSocial === 'NAO' &&
    alteracaoEnderecoSocio === 'SIM';
  const hasSociosStep =
    alteracaoQuadroSocietario === 'SIM' || alteracaoEnderecoSocio === 'SIM';
 

  useEffect(() => {
    if (
      alteracoesSelecionadas.includes('transformacao') &&
      !alteracoesSelecionadas.includes('nome')
    ) {
      setAlteracoesSelecionadas((prev) => [...prev, 'nome']);
    }
  }, [alteracoesSelecionadas]);

  useEffect(() => {
    if (!canAlterarEnderecoSocio) {
      setAlteracaoEnderecoSocio('');
    }
  }, [canAlterarEnderecoSocio]);

  const parseCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return 0;
    const cents = parseInt(digits, 10);
    if (isNaN(cents)) return 0;
    return cents / 100;
  };

  const totalParticipacao = useMemo(() => {
    const total = socios.reduce((sum, socio) => {
      const natureza = (socio as any).natureza_evento as string | undefined;
      const conta = natureza === 'SAIDA' ? 0 : (socio.participacao || 0);
      return sum + conta;
    }, 0);
    return Math.round(total * 100) / 100;
  }, [socios]);

  const capitalBaseForAlteracao =
    isAlteracao && (capitalDisplay || novoCapitalDisplay)
      ? parseCurrency(
          alteracaoCapitalSocial === 'SIM' ? novoCapitalDisplay || capitalDisplay : capitalDisplay
        )
      : 0;

  const filteredNaturezas = useMemo(() => {
    if (naturezaSearch.trim().length < 3) return [];
    const query = naturezaSearch.toLowerCase();
    return NATUREZA_JURIDICA_OPTIONS.filter((item) =>
      item.toLowerCase().includes(query),
    ).slice(0, 20);
  }, [naturezaSearch]);

  const handleRemoveSocio = (id: number) => {
    setSocios((prev) => prev.filter((s) => s.id !== id));
    if (editingSocioId === id) {
      setEditingSocioId(null);
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
      setCpfError('');
      setCurrentSocioNatureza('');
      setCurrentSocioQualificacao('');
      setCurrentSocioPais('');
    }
  };

  const startEditSocio = (id: number) => {
    const socio = socios.find((s) => s.id === id);
    if (!socio) return;
    setEditingSocioId(id);
    setCurrentSocioNatureza((socio as any).natureza_evento || '');
    setCurrentSocioQualificacao((socio as any).qualificacao || '');
    setCurrentSocioPais((socio as any).pais || '');
    setCurrentSocioNome(socio.nome || '');
    setCurrentSocioCpf(socio.cpf || '');
    setCurrentSocioBirthDate(
      socio.data_nascimento instanceof Date
        ? socio.data_nascimento
        : socio.data_nascimento
        ? new Date(socio.data_nascimento)
        : undefined
    );
    setCurrentSocioRg(socio.rg || '');
    setCurrentSocioCnh(socio.cnh || '');
    setCurrentSocioParticipacao(socio.participacao || 0);
    setCurrentSocioParticipacaoDisplay(
      socio.participacao
        ? socio.participacao.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : ''
    );
    setCurrentSocioCep(socio.cep || '');
    setCurrentSocioLogradouroTipo(socio.logradouro_tipo || '');
    setCurrentSocioLogradouro(socio.logradouro || '');
    setCurrentSocioNumero(socio.numero || '');
    setCurrentSocioComplemento(socio.complemento || '');
    setCurrentSocioBairro(socio.bairro || '');
    setCurrentSocioMunicipio(socio.municipio || '');
    setCurrentSocioUf(socio.uf || '');
    setCpfError('');
  };

  const handleAddCnae = (cnae: { id: string; descricao: string }) => {
    setSelectedCnaes((prev) => {
      const exists = prev.some((item) => item.id === cnae.id && item.tipo === cnaeTipo);
      if (exists) return prev;
      const hasPrincipal = prev.some((item) => item.tipo === 'PRINCIPAL');
      const tipo = hasPrincipal ? 'SECUNDARIA' : cnaeTipo;
      return [...prev, { ...cnae, tipo }];
    });
    setCnaeSearch('');
  };

  const handleRemoveCnae = (id: string, tipo: 'PRINCIPAL' | 'SECUNDARIA') => {
    setSelectedCnaes((prev) => prev.filter((item) => !(item.id === id && item.tipo === tipo)));
  };
  
  useEffect(() => {
    const term = debouncedCnaeSearch.trim();
    if (term.length < 3) {
      setCnaeResults([]);
      setCnaeLoading(false);
      setCnaeError('');
      return;
    }

    let cancelled = false;
    setCnaeLoading(true);
    setCnaeError('');

    loadCnaeClasses()
      .then((all) => {
        if (cancelled) return;
        const lower = term.toLowerCase();
        const filtered = all
          .filter(
            (item) =>
              item.id.toLowerCase().includes(lower) ||
              item.descricao.toLowerCase().includes(lower),
          )
          .slice(0, 20);
        setCnaeResults(filtered);
      })
      .catch(() => {
        if (!cancelled) setCnaeError('Erro ao buscar CNAE');
      })
      .finally(() => {
        if (!cancelled) setCnaeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedCnaeSearch]);

  useEffect(() => {
    if (initialValues?.socios && initialValues.socios.length > 0) {
      const mapped = initialValues.socios.map((s, idx) => ({
        id: idx,
        nome: s.nome || '',
        cpf: s.cpf || '',
        data_nascimento: s.data_nascimento ? new Date(s.data_nascimento) : undefined,
        rg: s.rg || '',
        cnh: s.cnh || '',
        participacao: typeof s.participacao_percent === 'number' ? s.participacao_percent : 0,
        cep: s.cep || '',
        logradouro_tipo: s.logradouro_tipo || '',
        logradouro: s.logradouro || '',
        numero: s.numero || '',
        complemento: s.complemento || '',
        bairro: s.bairro || '',
        municipio: s.municipio || '',
        uf: s.uf || '',
      }));
      setSocios(mapped);
    }
    if (initialValues?.natureza_juridica) {
      setNaturezaSearch(initialValues.natureza_juridica);
      setSelectedNatureza(initialValues.natureza_juridica);
    }
    if (initialValues?.cnaes && initialValues.cnaes.length > 0) {
      const mapped = initialValues.cnaes.map((c, idx) => ({
        id: c.id,
        descricao: c.descricao,
        tipo: (idx === 0 ? 'PRINCIPAL' : 'SECUNDARIA') as 'PRINCIPAL' | 'SECUNDARIA',
      })) as { id: string; descricao: string; tipo: 'PRINCIPAL' | 'SECUNDARIA' }[];
      setSelectedCnaes(mapped);
    }
  }, []);

  const handleTypeChange = (value: string) => {
    setType(value);
    if (value === 'CONSTITUICAO') {
      setStep(1);
    } else {
      setStep(1);
    }
  };

  const handleCapitalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    const cents = parseInt(digits, 10);
    if (!digits || isNaN(cents)) {
      setCapitalDisplay('');
      return;
    }
    const floatVal = cents / 100;
    setCapitalDisplay(
      floatVal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const handleNovoCapitalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    const cents = parseInt(digits, 10);
    if (!digits || isNaN(cents)) {
      setNovoCapitalDisplay('');
      return;
    }
    const floatVal = cents / 100;
    setNovoCapitalDisplay(
      floatVal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
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

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    }
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const validateCPF = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1+$/.test(digits)) return false;
    const calc = (factor: number) => {
      let total = 0;
      for (let i = 0; i < factor - 1; i++) {
        total += parseInt(digits[i]) * (factor - i);
      }
      const rest = (total * 10) % 11;
      return rest === 10 ? 0 : rest;
    };
    const d1 = calc(10);
    const d2 = calc(11);
    return d1 === parseInt(digits[9]) && d2 === parseInt(digits[10]);
  };

  const handleCepComplChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) {
      value = value.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
    }
    setCepCompl(value);
  };

  const lookupCepCompl = async () => {
    const digits = cepCompl.replace(/\D/g, '');
    if (digits.length !== 8) {
      toast.error('CEP inválido (precisa ter 8 dígitos)');
      return;
    }
    try {
      const res = await fetch(`/api/cep?cep=${digits}`);
      const data = await res.json();
      if (data && !data.error) {
        const tipo = data.tipo || '';
        const nome = data.nome || '';
        if (complTipoRef.current) complTipoRef.current.value = tipo;
        if (complLogradouroRef.current) complLogradouroRef.current.value = nome || data.logradouro || '';
        if (complBairroRef.current) complBairroRef.current.value = data.bairro || '';
        if (complMunicipioRef.current) complMunicipioRef.current.value = data.localidade || '';
        if (complUfRef.current) complUfRef.current.value = data.uf || '';
        if (complComplementoRef.current) complComplementoRef.current.value = data.complemento || '';
        toast.success('Endereço preenchido pelo CEP');
      } else {
        toast.error(data?.error || 'CEP não encontrado');
      }
    } catch (err) {
      toast.error('Falha ao buscar CEP');
    }
  };

  const formatCEP = (value: string | null | undefined) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return digits.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
  };
  const formatCurrencyFromCentavos = (centavos: number | null | undefined) => {
    const v = typeof centavos === 'number' ? centavos : 0;
    const floatVal = v / 100;
    return floatVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const composeAddress = (c: CompanyDetails) => {
    const parts: string[] = [];
    const streetLine = [c.address_type, c.address_street].filter(Boolean).join(' ');
    if (streetLine) parts.push(streetLine);
    if (c.address_number) parts.push(`Nº ${c.address_number}`);
    if (c.address_complement) parts.push(c.address_complement);
    const locality = [c.address_neighborhood, c.municipio, c.uf].filter(Boolean).join(' - ');
    if (locality) parts.push(locality);
    const cep = formatCEP(c.address_zip_code);
    if (cep) parts.push(`CEP ${cep}`);
    return parts.join(', ');
  };

  useEffect(() => {
    if (initialCompanyId) {
      getCompanyDetailsFull(initialCompanyId).then((c) => {
        setCompanyDetails(c as any);
      }).catch(() => {});
    }
  }, [initialCompanyId]);
  
  useEffect(() => {
    const id = selectedCompany?.id;
    if (!id) return;
    getCompanyDetailsFull(id).then((c) => {
      setCompanyDetails(c as any);
    }).catch(() => {
      setCompanyDetails(null);
    });
  }, [selectedCompany?.id]);

  if (isConstituicao) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Processo</label>
          <select
            name="type"
            className="border rounded h-10 px-3 w-full"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
            disabled={readonlyType}
          >
            <option value="">Selecione</option>
            <option value="CONSTITUICAO">Constituição</option>
            <option value="ALTERACAO">Alteração</option>
            <option value="BAIXA">Baixa</option>
          </select>
          {readonlyType && (
            <input type="hidden" name="type" value={type} />
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={step === 1 ? 'font-semibold' : ''}>1. Dados da Empresa</span>
          <span>›</span>
          <span className={step === 2 ? 'font-semibold' : ''}>2. Dados dos Sócios</span>
          <span>›</span>
          <span className={step === 3 ? 'font-semibold' : ''}>3. Dados Complementares</span>
        </div>

        <div className="space-y-6 border rounded-md p-4" hidden={step !== 1} suppressHydrationWarning>
            <h2 className="text-lg font-semibold">Dados da Empresa</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">Razão Social</label>
              <Input name="razao_social" defaultValue={initialValues?.razao_social || ''} onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase(); }} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Fantasia</label>
              <Input name="nome_fantasia" defaultValue={initialValues?.nome_fantasia || ''} onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase(); }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Capital Social (R$)</label>
                <Input
                  name="capital_social_display"
                  value={capitalDisplay}
                  onChange={handleCapitalChange}
                  placeholder="0,00"
                />
                <input
                  type="hidden"
                  name="capital_social_centavos"
                  value={capitalDisplay ? parseInt(capitalDisplay.replace(/\D/g, ''), 10) : ''}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sócio Administrador</label>
                <Input name="socio_administrador" defaultValue={initialValues?.socio_administrador || ''} onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase(); }} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone</label>
                <Input 
                  name="telefone" 
                  defaultValue={initialValues?.telefone || ''}
                  onInput={(e) => { e.currentTarget.value = formatPhone(e.currentTarget.value); }}
                  maxLength={15}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input name="email" defaultValue={initialValues?.email || ''} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Objeto Social</label>
              <Input name="objeto_social" defaultValue={initialValues?.objeto_social || ''} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observação</label>
              <Input name="observacao" defaultValue={initialValues?.observacao || ''} onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase(); }} />
            </div>
            <div className="flex justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar inclusão?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você perderá todos os dados preenchidos. Deseja continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => router.push('/admin/societario?tab=processos')}>
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="button" onClick={() => setStep(2)}>
                Avançar
              </Button>
            </div>
          </div>
        <div className="space-y-6 border rounded-md p-4" hidden={step !== 2} suppressHydrationWarning>
            <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome completo do sócio</label>
                  <Input
                    value={currentSocioNome}
                    onChange={(e) => setCurrentSocioNome(e.target.value.toUpperCase())}
                    disabled={alteracaoQuadroSocietario !== 'SIM' && alteracaoEnderecoSocio === 'SIM'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data de nascimento</label>
                  <DatePicker
                    date={currentSocioBirthDate}
                    setDate={(date) => {
                      setCurrentSocioBirthDate(date || undefined);
                    }}
                    disabled={alteracaoQuadroSocietario !== 'SIM' && alteracaoEnderecoSocio === 'SIM'}
                  />
                </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CPF</label>
                  <Input
                    value={currentSocioCpf}
                    onChange={(e) => setCurrentSocioCpf(formatCPF(e.currentTarget.value))}
                    onBlur={(e) => {
                      const value = e.currentTarget.value;
                      const isValid = validateCPF(value);
                      setCpfError(isValid ? '' : 'CPF inválido');
                      if (!isValid) toast.error('CPF inválido');
                    }}
                    maxLength={14}
                    disabled={alteracaoQuadroSocietario !== 'SIM' && alteracaoEnderecoSocio === 'SIM'}
                  />
                  {cpfError && <p className="text-xs text-red-500">{cpfError}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">RG</label>
                  <Input
                    value={currentSocioRg}
                    onChange={(e) => setCurrentSocioRg(e.target.value.toUpperCase())}
                    disabled={alteracaoQuadroSocietario !== 'SIM' && alteracaoEnderecoSocio === 'SIM'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CNH</label>
                  <Input
                    value={currentSocioCnh}
                    onChange={(e) => setCurrentSocioCnh(e.target.value.toUpperCase())}
                    disabled={alteracaoQuadroSocietario !== 'SIM' && alteracaoEnderecoSocio === 'SIM'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Participação (%)</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={currentSocioParticipacaoDisplay}
                    onChange={(e) => {
                      const raw = e.currentTarget.value;
                      const digits = raw.replace(/\D/g, '');
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
                      const formattedDisplay = `${intNum.toString()},${decNum
                        .toString()
                        .padStart(2, '0')}`;
                      setCurrentSocioParticipacaoDisplay(formattedDisplay);
                      const numeric = intNum + decNum / 100;
                      setCurrentSocioParticipacao(numeric);
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CEP</label>
                    <div className="relative">
                      <Input
                        placeholder="00000-000"
                        maxLength={9}
                        value={currentSocioCep}
                        onChange={handleSocioCepChange}
                        className="pr-9"
                      />
                      <button
                        type="button"
                        onClick={lookupSocioCep}
                        className="absolute right-1 top-1.5 h-7 w-7 inline-flex items-center justify-center rounded border bg-white hover:bg-muted text-xs disabled:opacity-50"
                        disabled={socioCepLoading}
                        title="Buscar endereço"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Logradouro</label>
                    <Input
                      value={currentSocioLogradouroTipo}
                      onChange={(e) => setCurrentSocioLogradouroTipo(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Logradouro</label>
                    <Input
                      value={currentSocioLogradouro}
                      onChange={(e) => setCurrentSocioLogradouro(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número</label>
                    <Input
                      value={currentSocioNumero}
                      onChange={(e) => setCurrentSocioNumero(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Complemento</label>
                    <Input
                      value={currentSocioComplemento}
                      onChange={(e) => setCurrentSocioComplemento(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bairro</label>
                    <Input
                      value={currentSocioBairro}
                      onChange={(e) => setCurrentSocioBairro(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Município</label>
                    <Input
                      value={currentSocioMunicipio}
                      onChange={(e) => setCurrentSocioMunicipio(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">UF</label>
                    <Input
                      value={currentSocioUf}
                      onChange={(e) => setCurrentSocioUf(e.target.value)}
                    />
                </div>
              </div>
            <div className="mb-2">
              <Button
                type="button"
                variant="outline"
                disabled={totalParticipacao >= 100}
                onClick={() => {
                  if (!currentSocioNome.trim()) {
                    toast.error('Informe o nome do sócio');
                    return;
                  }
                  if (!currentSocioCpf || !validateCPF(currentSocioCpf)) {
                    toast.error('CPF inválido');
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
                  setCpfError('');
                }}
              >
                Adicionar sócio
              </Button>
            </div>
            {socios.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Sócios incluídos</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left">CPF/CNPJ Sócio</th>
                        <th className="px-3 py-2 text-left">Nome</th>
                        <th className="px-3 py-2 text-left">Percentual de Participação</th>
                        <th className="px-3 py-2 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {socios.map((socio) => (
                        <tr key={socio.id} className="border-t">
                          <td className="px-3 py-2 align-top">{socio.cpf || '-'}</td>
                          <td className="px-3 py-2 align-top">{socio.nome || '-'}</td>
                          <td className="px-3 py-2 align-top">
                            {socio.participacao
                              ? `${socio.participacao.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}%`
                              : '-'}
                          </td>
                          <td className="px-3 py-2 align-top text-right">
                            <button
                              type="button"
                              className="text-sm text-red-600 hover:underline"
                              onClick={() => handleRemoveSocio(socio.id)}
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total das participações:{' '}
                  {totalParticipacao.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  %
                </p>
                <div className="hidden">
                  {socios.map((socio, index) => (
                    <div key={socio.id}>
                      <input
                        type="hidden"
                        name={`socio[${index}][nome]`}
                        value={socio.nome}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][cpf]`}
                        value={socio.cpf}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][data_nascimento]`}
                        value={
                          socio.data_nascimento
                            ? format(socio.data_nascimento as Date, 'yyyy-MM-dd')
                            : ''
                        }
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][rg]`}
                        value={socio.rg || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][cnh]`}
                        value={socio.cnh || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][participacao_percent]`}
                        value={socio.participacao}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][cep]`}
                        value={socio.cep || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][logradouro_tipo]`}
                        value={socio.logradouro_tipo || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][logradouro]`}
                        value={socio.logradouro || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][numero]`}
                        value={socio.numero || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][complemento]`}
                        value={socio.complemento || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][bairro]`}
                        value={socio.bairro || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][municipio]`}
                        value={socio.municipio || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][uf]`}
                        value={socio.uf || ''}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar inclusão?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Você perderá todos os dados preenchidos. Deseja continuar?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => router.push('/admin/societario?tab=processos')}>
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  type="button"
                  onClick={() => {
                    if (socios.length === 0) {
                      toast.error('Inclua pelo menos um sócio');
                      return;
                    }
                    if (totalParticipacao !== 100) {
                      toast.error('A soma das participações deve ser exatamente 100%');
                      return;
                    }
                    setStep(3);
                  }}
                >
                  Avançar
                </Button>
              </div>
            </div>
          </div>

        <div className="space-y-6 border rounded-md p-4" hidden={step !== 3} suppressHydrationWarning>
            <h2 className="text-lg font-semibold">Dados Complementares</h2>
 

 

 

 

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Porte Empresarial</label>
                <Select value={porte} onValueChange={setPorte}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o porte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEI">MEI</SelectItem>
                    <SelectItem value="ME">ME</SelectItem>
                    <SelectItem value="EPP">EPP</SelectItem>
                    <SelectItem value="MEDIO PORTE">Médio Porte</SelectItem>
                    <SelectItem value="GRANDE PORTE">Grande Porte</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="porte" value={porte} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tributação</label>
                <Select value={tributacao} onValueChange={setTributacao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a tributação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEI">MEI</SelectItem>
                    <SelectItem value="SIMPLES NACIONAL">Simples Nacional</SelectItem>
                    <SelectItem value="LUCRO PRESUMIDO">Lucro Presumido</SelectItem>
                    <SelectItem value="LUCRO REAL">Lucro Real</SelectItem>
                    <SelectItem value="IMUNE">Imune</SelectItem>
                    <SelectItem value="ISENTA">Isenta</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" name="tributacao" value={tributacao} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-md font-semibold">CNAE</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Buscar CNAE por código ou descrição</label>
                  <Input
                    value={cnaeSearch}
                    onChange={(e) => setCnaeSearch(e.target.value)}
                    placeholder="Digite pelo menos 3 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Atividade</label>
                  <Select
                    value={cnaeTipo}
                    onValueChange={(val: 'PRINCIPAL' | 'SECUNDARIA') => setCnaeTipo(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="PRINCIPAL"
                        disabled={selectedCnaes.some((item) => item.tipo === 'PRINCIPAL')}
                      >
                        Principal
                      </SelectItem>
                      <SelectItem value="SECUNDARIA">Secundária</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {cnaeLoading && (
                <div className="text-sm text-muted-foreground">Buscando CNAE...</div>
              )}
              {cnaeError && !cnaeLoading && (
                <div className="text-sm text-red-600">{cnaeError}</div>
              )}

              {cnaeResults.length > 0 && !cnaeLoading && (
                <div className="border rounded-md max-h-56 overflow-y-auto text-sm">
                  {cnaeResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full flex justify-between items-center px-3 py-2 hover:bg-accent"
                      onClick={() => handleAddCnae(item)}
                    >
                      <span className="font-mono mr-2">{item.id}</span>
                      <span className="flex-1 text-left">{item.descricao}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedCnaes.length > 0 && (
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left">CNAE</th>
                        <th className="px-3 py-2 text-left">Tipo</th>
                        <th className="px-3 py-2 text-left">Descrição</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCnaes.map((item, index) => (
                        <tr key={`${item.id}-${item.tipo}`} className="border-t">
                          <td className="px-3 py-2 align-top font-mono">{item.id}</td>
                          <td className="px-3 py-2 align-top">
                            {item.tipo === 'PRINCIPAL' ? 'Principal' : 'Secundária'}
                          </td>
                          <td className="px-3 py-2 align-top">{item.descricao}</td>
                          <td className="px-3 py-2 align-top text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveCnae(item.id, item.tipo)}
                            >
                              Remover
                            </Button>
                          </td>
                          <td className="hidden">
                            <input type="hidden" name={`cnaes[${index}][code]`} value={item.id} />
                            <input type="hidden" name={`cnaes[${index}][descricao]`} value={item.descricao} />
                            <input type="hidden" name={`cnaes[${index}][tipo]`} value={item.tipo} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar inclusão?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Você perderá todos os dados preenchidos. Deseja continuar?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => router.push('/admin/societario?tab=processos')}>
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button type="submit">Concluir</Button>
              </div>
            </div>
            </div>
        </div>
    );
  }

  if (isAlteracao) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Processo</label>
          <select
            name="type"
            className="border rounded h-10 px-3 w-full"
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
            disabled={readonlyType}
          >
            <option value="">Selecione</option>
            <option value="CONSTITUICAO">Constituição</option>
            <option value="ALTERACAO">Alteração</option>
            <option value="BAIXA">Baixa</option>
          </select>
          {readonlyType && <input type="hidden" name="type" value={type} />}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={step === 1 ? 'font-semibold' : ''}>1. Dados da Empresa</span>
          <span>›</span>
          <span
            className={
              step === 2 && hasSociosStep
                ? 'font-semibold'
                : step !== 1 && !hasSociosStep
                ? 'font-semibold'
                : ''
            }
          >
            {hasSociosStep ? '2. Movimentação de Sócios' : '2. Dados Complementares'}
          </span>
          {hasSociosStep && (
            <>
              <span>›</span>
              <span className={step === 3 ? 'font-semibold' : ''}>3. Dados Complementares</span>
            </>
          )}
        </div>

        <div className="space-y-6 border rounded-md p-4" hidden={step !== 1} suppressHydrationWarning>
          <h2 className="text-lg font-semibold">Dados da Empresa</h2>
          <SocietarioCompanySelector
            initialCompanyId={initialCompanyId}
            disabled={selectorDisabled}
            onCompanySelected={async (company) => {
              setSelectedCompany(company);
              try {
                const details = await getCompanyDetailsFull(company.id);
                setCompanyDetails(details as any);
                if (type === 'ALTERACAO' && socios.length === 0) {
                  const companySocios = await getCompanySocios(company.id);
                  if (companySocios && companySocios.length > 0) {
                    const mapped = companySocios.map((s, index) => ({
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
                    }));
                    setSocios(mapped);
                    setNextSocioId(companySocios.length);
                  }
                }
              } catch {
                setCompanyDetails(null);
              }
            }}
          />

          {selectedCompany && (
            <div className="rounded border p-4 text-sm space-y-1">
              <div>Razão Social: {companyDetails?.razao_social || selectedCompany.razao_social || '-'}</div>
              <div>CNPJ: {selectedCompany.cnpj || '-'}</div>
              <div>Código: {companyDetails?.code || '-'}</div>
              <div>Capital Social: R$ {formatCurrencyFromCentavos(companyDetails?.capital_social_centavos ?? null)}</div>
              <div>Contato: {companyDetails?.telefone ? formatPhone(String(companyDetails.telefone)) : '-'} • {companyDetails?.email_contato || '-'}</div>
              <div>Endereço: {companyDetails ? composeAddress(companyDetails) : '-'}</div>
            </div>
          )}

          

          <div className="space-y-2">
            <label className="text-sm font-medium">Haverá alteração no quadro societário?</label>
            <select
              name="alteracao_quadro_societario"
              className="border rounded h-10 px-3 w-full"
              value={alteracaoQuadroSocietario}
              onChange={(e) =>
                setAlteracaoQuadroSocietario(e.target.value as 'SIM' | 'NAO' | '')
              }
            >
              <option value="">Selecione</option>
              <option value="SIM">Sim</option>
              <option value="NAO">Não</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Haverá alteração do capital social?</label>
            <select
              name="alteracao_capital_social"
              className="border rounded h-10 px-3 w-full"
              value={alteracaoCapitalSocial}
              onChange={(e) =>
                setAlteracaoCapitalSocial(e.target.value as 'SIM' | 'NAO' | '')
              }
            >
              <option value="">Selecione</option>
              <option value="SIM">Sim</option>
              <option value="NAO">Não</option>
            </select>
          </div>
          {alteracaoCapitalSocial === 'SIM' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Novo Capital Social (R$)</label>
              <Input
                name="novo_capital_social_display"
                value={novoCapitalDisplay}
                onChange={handleNovoCapitalChange}
                placeholder="0,00"
              />
              <input
                type="hidden"
                name="novo_capital_social_centavos"
                value={novoCapitalDisplay ? parseInt(novoCapitalDisplay.replace(/\D/g, ''), 10) : ''}
              />
              <input
                type="hidden"
                name="capital_social_centavos"
                value={novoCapitalDisplay ? parseInt(novoCapitalDisplay.replace(/\D/g, ''), 10) : ''}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Haverá alteração de dados do sócio?
            </label>
            <select
              name="alteracao_endereco_socio"
              className="border rounded h-10 px-3 w-full"
              value={alteracaoEnderecoSocio}
              onChange={(e) =>
                setAlteracaoEnderecoSocio(e.target.value as 'SIM' | 'NAO' | '')
              }
              disabled={!canAlterarEnderecoSocio}
            >
              <option value="">Selecione</option>
              <option value="SIM">Sim</option>
              <option value="NAO">Não</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Selecione as alterações a serem realizadas</label>
            <div className="space-y-2 text-sm">
              {[
                { id: 'transformacao', label: 'Natureza Jurídica - Transformação' },
                { id: 'nome', label: 'Nome' },
                { id: 'alteracao_endereco', label: 'Alteração de endereço' },
                { id: 'alteracao_objeto_social', label: 'Alteração de Objeto Social' },
              ].map((opt) => (
                <label key={opt.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={alteracoesSelecionadas.includes(opt.id)}
                    disabled={opt.id === 'nome' && alteracoesSelecionadas.includes('transformacao')}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      setAlteracoesSelecionadas((prev) =>
                        checked ? [...prev, opt.id] : prev.filter((v) => v !== opt.id)
                      );
                    }}
                  />
                  <span>{opt.label}</span>
                  {opt.id === 'transformacao' &&
                    alteracoesSelecionadas.includes('transformacao') && (
                      <div className="ml-6 mt-2 w-full">
                        <label className="text-sm font-medium">Número da Alteração</label>
                        <Input
                          name="numero_alteracao"
                          value={numeroAlteracao}
                          maxLength={6}
                          onChange={(e) => setNumeroAlteracao(e.target.value)}
                        />
                      </div>
                    )}
                </label>
              ))}
            </div>
            <input
              type="hidden"
              name="alteracoes_selecionadas"
              value={alteracoesSelecionadas.join(',')}
            />
          </div>

          <div className="flex justify-between">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar inclusão?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você perderá todos os dados preenchidos. Deseja continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => router.push('/admin/societario?tab=processos')}
                  >
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              type="button"
              onClick={() => {
                if (!selectedCompany && !initialCompanyId) {
                  toast.error('Selecione uma empresa');
                  return;
                }
                if (!alteracaoQuadroSocietario) {
                  toast.error('Informe se haverá alteração no quadro societário');
                  return;
                }
                if (!alteracaoCapitalSocial) {
                  toast.error('Informe se haverá alteração do capital social');
                  return;
                }
                if (alteracaoCapitalSocial === 'SIM' && !novoCapitalDisplay) {
                  toast.error('Informe o novo capital social');
                  return;
                }
                if (canAlterarEnderecoSocio && !alteracaoEnderecoSocio) {
                  toast.error('Informe se haverá alteração do endereço do sócio');
                  return;
                }
                if (hasSociosStep) {
                  setStep(2);
                } else {
                  setStep(2);
                }
              }}
            >
              Avançar
            </Button>
          </div>
        </div>

        {hasSociosStep && (
          <div className="space-y-6 border rounded-md p-4" hidden={step !== 2} suppressHydrationWarning>
            <h2 className="text-lg font-semibold">Movimentação de Sócios</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Natureza do evento</label>
                  <select
                    className="border rounded h-10 px-3 w-full"
                    value={currentSocioNatureza}
                    onChange={(e) =>
                      setCurrentSocioNatureza(
                        e.currentTarget.value as 'ENTRADA' | 'SAIDA' | 'ALTERACAO' | '',
                      )
                    }
                    disabled={onlyDadosSocio}
                  >
                    <option value="">Selecione</option>
                    <option value="ENTRADA">Entrada de sócio/administrador</option>
                    <option value="SAIDA">Saída de sócio/administrador</option>
                    <option value="ALTERACAO">Alteração de dados do sócio/administrador</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Qualificação do sócio/administrador</label>
                  <select
                    className="border rounded h-10 px-3 w-full"
                    value={currentSocioQualificacao}
                    onChange={(e) => setCurrentSocioQualificacao(e.currentTarget.value)}
                    disabled={onlyDadosSocio}
                  >
                    <option value="">Selecione</option>
                    <option value="5">5 Administrador</option>
                    <option value="22">22 Sócio</option>
                    <option value="29">29 Sócio Incapaz ou Relat.Incapaz (exceto menor)</option>
                    <option value="30">30 Sócio Menor (Assistido/Representado)</option>
                    <option value="37">37 Sócio Pessoa Jurídica Domiciliado no Exterior</option>
                    <option value="38">38 Sócio Pessoa Física Residente no Exterior</option>
                    <option value="49">49 Sócio-Administrador</option>
                    <option value="63">63 Cotas em Tesouraria</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">País</label>
                  <Input
                    value={currentSocioPais}
                    onChange={(e) => setCurrentSocioPais(e.target.value.toUpperCase())}
                    disabled={
                      currentSocioQualificacao !== '37' ||
                      (alteracaoQuadroSocietario !== 'SIM' && alteracaoEnderecoSocio === 'SIM')
                    }
                    placeholder="Somente quando qualificação = 37"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome completo do sócio</label>
                <Input
                  value={currentSocioNome}
                  onChange={(e) => setCurrentSocioNome(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data de nascimento</label>
                <DatePicker
                  date={currentSocioBirthDate}
                  setDate={(date) => {
                    setCurrentSocioBirthDate(date || undefined);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">CPF</label>
                <Input
                  value={currentSocioCpf}
                  onChange={(e) => setCurrentSocioCpf(formatCPF(e.currentTarget.value))}
                  onBlur={(e) => {
                    const value = e.currentTarget.value;
                    const isValid = validateCPF(value);
                    setCpfError(isValid ? '' : 'CPF inválido');
                    if (!isValid) toast.error('CPF inválido');
                  }}
                  maxLength={14}
                />
                {cpfError && <p className="text-xs text-red-500">{cpfError}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">RG</label>
                <Input
                  value={currentSocioRg}
                  onChange={(e) => setCurrentSocioRg(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">CNH</label>
                <Input
                  value={currentSocioCnh}
                  onChange={(e) => setCurrentSocioCnh(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Percentual Cotas (%)</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={currentSocioParticipacaoDisplay}
                  disabled={onlyDadosSocio}
                  onChange={(e) => {
                    const raw = e.currentTarget.value;
                    const digits = raw.replace(/\D/g, '');
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
                    const formattedDisplay = `${intNum.toString()},${decNum
                      .toString()
                      .padStart(2, '0')}`;
                    setCurrentSocioParticipacaoDisplay(formattedDisplay);
                    const numeric = intNum + decNum / 100;
                    setCurrentSocioParticipacao(numeric);
                  }}
                />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">CEP</label>
                  <div className="relative">
                    <Input
                      placeholder="00000-000"
                      maxLength={9}
                      value={currentSocioCep}
                      onChange={handleSocioCepChange}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={lookupSocioCep}
                      className="absolute right-1 top-1.5 h-7 w-7 inline-flex items-center justify-center rounded border bg-white hover:bg-muted text-xs disabled:opacity-50"
                      disabled={socioCepLoading}
                      title="Buscar endereço"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Logradouro</label>
                  <Input
                    value={currentSocioLogradouroTipo}
                    onChange={(e) => setCurrentSocioLogradouroTipo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Logradouro</label>
                  <Input
                    value={currentSocioLogradouro}
                    onChange={(e) => setCurrentSocioLogradouro(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número</label>
                  <Input
                    value={currentSocioNumero}
                    onChange={(e) => setCurrentSocioNumero(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Complemento</label>
                  <Input
                    value={currentSocioComplemento}
                    onChange={(e) => setCurrentSocioComplemento(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bairro</label>
                  <Input
                    value={currentSocioBairro}
                    onChange={(e) => setCurrentSocioBairro(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Município</label>
                  <Input
                    value={currentSocioMunicipio}
                    onChange={(e) => setCurrentSocioMunicipio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">UF</label>
                  <Input
                    value={currentSocioUf}
                    onChange={(e) => setCurrentSocioUf(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mb-2">
              <Button
                type="button"
                variant="outline"
                disabled={
                  (onlyDadosSocio && editingSocioId === null) ||
                  (editingSocioId === null &&
                    totalParticipacao >= 100 &&
                    currentSocioNatureza !== 'SAIDA')
                }
                onClick={() => {
                  if (onlyDadosSocio) {
                    if (editingSocioId === null) {
                      toast.error(
                        'Nesta operação só é permitido editar endereço de sócio existente',
                      );
                      return;
                    }
                  }
                  if (!currentSocioNatureza) {
                    toast.error('Informe a natureza do evento');
                    return;
                  }
                  if (!currentSocioQualificacao) {
                    toast.error('Informe a qualificação do sócio/administrador');
                    return;
                  }
                  if (currentSocioQualificacao === '37' && !currentSocioPais.trim()) {
                    toast.error('Informe o país (qualificação 37)');
                    return;
                  }
                  if (!currentSocioNome.trim()) {
                    toast.error('Informe o nome do sócio');
                    return;
                  }
                  if (!currentSocioCpf || !validateCPF(currentSocioCpf)) {
                    toast.error('CPF inválido');
                    return;
                  }
                  if (!currentSocioParticipacao || currentSocioParticipacao <= 0) {
                    if (currentSocioNatureza !== 'SAIDA' && !onlyDadosSocio) {
                      toast.error('Informe a participação do sócio');
                      return;
                    }
                  }
                  const socioExistente =
                    editingSocioId !== null
                      ? socios.find((s) => s.id === editingSocioId)
                      : null;
                  const baseTotal = (() => {
                    if (!socioExistente) return totalParticipacao;
                    const naturezaExistente = (socioExistente as any).natureza_evento;
                    const partExistenteConsiderada =
                      naturezaExistente === 'SAIDA' ? 0 : (socioExistente.participacao || 0);
                    return totalParticipacao - partExistenteConsiderada;
                  })();
                  const partNovaConsiderada =
                    currentSocioNatureza === 'SAIDA' ? 0 : currentSocioParticipacao;
                  const novoTotal = baseTotal + partNovaConsiderada;
                  if (novoTotal > 100) {
                    toast.error('O total das participações não pode ultrapassar 100%');
                    return;
                  }
                  if (editingSocioId !== null) {
                    setSocios((prev) =>
                      prev.map((s) =>
                        s.id === editingSocioId
                          ? {
                              ...s,
                              natureza_evento: currentSocioNatureza,
                              qualificacao: currentSocioQualificacao,
                              pais: currentSocioPais || '',
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
                            }
                          : s
                      )
                    );
                  } else {
                    const novoId = nextSocioId;
                    setSocios((prev) => [
                      ...prev,
                      {
                        id: novoId,
                        natureza_evento: currentSocioNatureza,
                        qualificacao: currentSocioQualificacao,
                        pais: currentSocioPais || '',
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
                  }
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
                  setCpfError('');
                  setEditingSocioId(null);
                  setCurrentSocioNatureza('');
                  setCurrentSocioQualificacao('');
                  setCurrentSocioPais('');
                }}
              >
                {editingSocioId === null ? 'Adicionar sócio' : 'Salvar alterações'}
              </Button>
            </div>

            {socios.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Sócios incluídos</h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left">CPF/CNPJ Sócio</th>
                        <th className="px-3 py-2 text-left">Nome</th>
                        <th className="px-3 py-2 text-left">Percentual de Participação</th>
                        <th className="px-3 py-2 text-left">Valor da Participação</th>
                        <th className="px-3 py-2 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {socios.map((socio) => {
                        const valorParticipacao =
                          capitalBaseForAlteracao > 0 && socio.participacao
                            ? (capitalBaseForAlteracao * socio.participacao) / 100
                            : 0;
                        return (
                          <tr key={socio.id} className="border-t">
                            <td className="px-3 py-2 align-top">{socio.cpf || '-'}</td>
                            <td className="px-3 py-2 align-top">{socio.nome || '-'}</td>
                            <td className="px-3 py-2 align-top">
                              {socio.participacao
                                ? `${socio.participacao.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}%`
                                : '-'}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {valorParticipacao
                                ? valorParticipacao.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                : '-'}
                            </td>
                            <td className="px-3 py-2 align-top text-right space-x-2">
                              <button
                                type="button"
                                className="text-sm text-blue-600 hover:underline"
                                onClick={() => startEditSocio(socio.id)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="text-sm text-red-600 hover:underline"
                                disabled={onlyDadosSocio}
                                onClick={() => {
                                  if (onlyDadosSocio) return;
                                  handleRemoveSocio(socio.id);
                                }}
                              >
                                Remover
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total das participações:{' '}
                  {totalParticipacao.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  %
                </p>
                <div className="hidden">
                  {socios.map((socio, index) => (
                    <div key={socio.id}>
                      <input
                        type="hidden"
                        name={`socio[${index}][nome]`}
                        value={socio.nome}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][cpf]`}
                        value={socio.cpf}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][data_nascimento]`}
                        value={
                          socio.data_nascimento
                            ? format(socio.data_nascimento as Date, 'yyyy-MM-dd')
                            : ''
                        }
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][rg]`}
                        value={socio.rg || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][cnh]`}
                        value={socio.cnh || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][participacao_percent]`}
                        value={(socio as any).natureza_evento === 'SAIDA' ? 0 : socio.participacao}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][natureza_evento]`}
                        value={(socio as any).natureza_evento || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][qualificacao]`}
                        value={(socio as any).qualificacao || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][pais]`}
                        value={(socio as any).pais || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][cep]`}
                        value={socio.cep || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][logradouro_tipo]`}
                        value={socio.logradouro_tipo || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][logradouro]`}
                        value={socio.logradouro || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][numero]`}
                        value={socio.numero || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][complemento]`}
                        value={socio.complemento || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][bairro]`}
                        value={socio.bairro || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][municipio]`}
                        value={socio.municipio || ''}
                      />
                      <input
                        type="hidden"
                        name={`socio[${index}][uf]`}
                        value={socio.uf || ''}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <div className="flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar inclusão?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Você perderá todos os dados preenchidos. Deseja continuar?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => router.push('/admin/societario?tab=processos')}
                      >
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  type="button"
                  onClick={() => {
                    if (socios.length === 0) {
                      toast.error('Inclua pelo menos um sócio');
                      return;
                    }
                    if (totalParticipacao !== 100) {
                      toast.error(
                        'A soma das participações deve ser exatamente 100%'
                      );
                      return;
                    }
                    setStep(3);
                  }}
                >
                  Avançar
                </Button>
              </div>
            </div>
          </div>
        )}

        <div
          className="space-y-6 border rounded-md p-4"
          suppressHydrationWarning
          hidden={(hasSociosStep && step !== 3) || (!hasSociosStep && step !== 2)}
        >
          <h2 className="text-lg font-semibold">Dados Complementares</h2>

          {alteracoesSelecionadas.includes('transformacao') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nova Razão Social</label>
                <Input name="nova_razao_social" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nova Natureza Jurídica</label>
                <Select
                  value={selectedNatureza}
                  onValueChange={(value) => {
                    setSelectedNatureza(value);
                    setNaturezaSearch(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a natureza jurídica" />
                  </SelectTrigger>
                  <SelectContent>
                    {NATUREZA_JURIDICA_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  type="hidden"
                  name="natureza_juridica"
                  value={selectedNatureza || ''}
                />
              </div>
            </div>
          )}

          {alteracoesSelecionadas.includes('alteracao_endereco') && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Inscrição Imobiliária</label>
                  <Input
                    name="inscricao_imobiliaria"
                    defaultValue={initialValues?.inscricao_imobiliaria || ''}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">CEP</label>
                  <div className="relative">
                    <Input
                      name="compl_cep"
                      value={cepCompl}
                      onChange={handleCepComplChange}
                      placeholder="00000-000"
                      maxLength={9}
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={lookupCepCompl}
                      className="absolute right-1 top-1.5 h-7 w-7 inline-flex items-center justify-center rounded border bg-white hover:bg-muted text-xs"
                      title="Buscar endereço"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Logradouro</label>
                  <Input
                    name="compl_logradouro_tipo"
                    ref={complTipoRef}
                    defaultValue={initialValues?.compl_logradouro_tipo || ''}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Logradouro</label>
                  <Input
                    name="compl_logradouro"
                    ref={complLogradouroRef}
                    defaultValue={initialValues?.compl_logradouro || ''}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número</label>
                  <Input
                    name="compl_numero"
                    defaultValue={initialValues?.compl_numero || ''}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Complemento</label>
                  <Input
                    name="compl_complemento"
                    ref={complComplementoRef}
                    defaultValue={initialValues?.compl_complemento || ''}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bairro</label>
                  <Input
                    name="compl_bairro"
                    ref={complBairroRef}
                    defaultValue={initialValues?.compl_bairro || ''}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Município</label>
                  <Input
                    name="compl_municipio"
                    ref={complMunicipioRef}
                    defaultValue={initialValues?.compl_municipio || ''}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">UF</label>
                  <Input
                    name="compl_uf"
                    ref={complUfRef}
                    defaultValue={initialValues?.compl_uf || ''}
                  />
                </div>
              </div>
            </>
          )}

          {alteracoesSelecionadas.includes('alteracao_objeto_social') && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Novo Objeto Social</label>
                <textarea
                  name="novo_objeto_social"
                  className="border rounded w-full p-2 min-h-[100px]"
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-md font-semibold">CNAE</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">
                      Buscar CNAE por código ou descrição
                    </label>
                    <Input
                      value={cnaeSearch}
                      onChange={(e) => setCnaeSearch(e.target.value)}
                      placeholder="Digite pelo menos 3 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Atividade</label>
                    <Select
                      value={cnaeTipo}
                      onValueChange={(val: 'PRINCIPAL' | 'SECUNDARIA') => setCnaeTipo(val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="PRINCIPAL"
                          disabled={selectedCnaes.some((item) => item.tipo === 'PRINCIPAL')}
                        >
                          Principal
                        </SelectItem>
                        <SelectItem value="SECUNDARIA">Secundária</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {cnaeLoading && (
                  <div className="text-sm text-muted-foreground">Buscando CNAE...</div>
                )}
                {cnaeError && !cnaeLoading && (
                  <div className="text-sm text-red-600">{cnaeError}</div>
                )}

                {cnaeResults.length > 0 && !cnaeLoading && (
                  <div className="border rounded-md max-h-56 overflow-y-auto text-sm">
                    {cnaeResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full flex justify-between items-center px-3 py-2 hover:bg-accent"
                        onClick={() => handleAddCnae(item)}
                      >
                        <span className="font-mono mr-2">{item.id}</span>
                        <span className="flex-1 text-left">{item.descricao}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedCnaes.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left">CNAE</th>
                          <th className="px-3 py-2 text-left">Tipo</th>
                          <th className="px-3 py-2 text-left">Descrição</th>
                          <th className="px-3 py-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCnaes.map((item, index) => (
                          <tr
                            key={`${item.id}-${item.tipo}`}
                            className="border-t"
                          >
                            <td className="px-3 py-2 align-top font-mono">{item.id}</td>
                            <td className="px-3 py-2 align-top">
                              {item.tipo === 'PRINCIPAL' ? 'Principal' : 'Secundária'}
                            </td>
                            <td className="px-3 py-2 align-top">{item.descricao}</td>
                            <td className="px-3 py-2 align-top text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveCnae(item.id, item.tipo)}
                              >
                                Remover
                              </Button>
                            </td>
                            <td className="hidden">
                              <input
                                type="hidden"
                                name={`cnaes[${index}][code]`}
                                value={item.id}
                              />
                              <input
                                type="hidden"
                                name={`cnaes[${index}][descricao]`}
                                value={item.descricao}
                              />
                              <input
                                type="hidden"
                                name={`cnaes[${index}][tipo]`}
                                value={item.tipo}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setStep(alteracaoQuadroSocietario === 'SIM' ? 2 : 1)
              }
            >
              Voltar
            </Button>
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar inclusão?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você perderá todos os dados preenchidos. Deseja continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => router.push('/admin/societario?tab=processos')}
                    >
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit">Concluir</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo de Processo</label>
        <select
          name="type"
          className="border rounded h-10 px-3 w-full"
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          disabled={readonlyType}
        >
          <option value="">Selecione</option>
          <option value="CONSTITUICAO">Constituição</option>
          <option value="ALTERACAO">Alteração</option>
          <option value="BAIXA">Baixa</option>
        </select>
        {readonlyType && <input type="hidden" name="type" value={type} />}
      </div>
    </div>
  );
}

let cnaeCache: { id: string; descricao: string }[] | null = null;

async function loadCnaeClasses(): Promise<{ id: string; descricao: string }[]> {
  if (cnaeCache) return cnaeCache;
  const response = await fetch('https://servicodados.ibge.gov.br/api/v2/cnae/classes');
  if (!response.ok) {
    throw new Error('Erro ao carregar CNAE');
  }
  const data = await response.json();
  const parsed = Array.isArray(data)
    ? data
    : [];
  cnaeCache = parsed.map((item: any) => ({
    id: String(item.id),
    descricao: String(item.descricao),
  }));
  return cnaeCache;
}
