'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { validateCPF } from '@/lib/validators';
import { saveSocio } from '@/app/actions/socios';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface SocioFormProps {
  companies: any[];
  initialData?: any;
}

export function SocioForm({ companies, initialData }: SocioFormProps) {
  const router = useRouter();
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialData?.company_id || '');
  const [openCompany, setOpenCompany] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [filial, setFilial] = useState(initialData?.filial || '');
  const [nome, setNome] = useState(initialData?.nome || '');
  const [cpf, setCpf] = useState(initialData?.cpf || '');
  const [cpfError, setCpfError] = useState('');
  const [participacao, setParticipacao] = useState(
    initialData?.participacao_percent 
      ? Number(initialData.participacao_percent).toFixed(2) 
      : '0.00'
  );
  const [dataNascimento, setDataNascimento] = useState<Date | undefined>(
    initialData?.data_nascimento ? new Date(initialData.data_nascimento) : undefined
  );
  const [rg, setRg] = useState(initialData?.rg || '');
  const [orgaoExpedidor, setOrgaoExpedidor] = useState(initialData?.orgao_expedidor || '');
  const [ufOrgaoExpedidor, setUfOrgaoExpedidor] = useState(initialData?.uf_orgao_expedidor || '');
  const [dataExpedicao, setDataExpedicao] = useState<Date | undefined>(
    initialData?.data_expedicao ? new Date(initialData.data_expedicao) : undefined
  );
  const [cep, setCep] = useState(initialData?.cep || '');
  const [logradouroTipo, setLogradouroTipo] = useState(initialData?.logradouro_tipo || '');
  const [logradouro, setLogradouro] = useState(initialData?.logradouro || '');
  const [numero, setNumero] = useState(initialData?.numero || '');
  const [complemento, setComplemento] = useState(initialData?.complemento || '');
  const [bairro, setBairro] = useState(initialData?.bairro || '');
  const [municipio, setMunicipio] = useState(initialData?.municipio || '');
  const [uf, setUf] = useState(initialData?.uf || '');

  const empresaSelecionada = companies.find((c) => c.id === selectedCompanyId) || null;
  const socioFieldsDisabled = !empresaSelecionada;

  function handleEmpresaChange(id: string) {
    setSelectedCompanyId(id);
    const company = companies.find(c => c.id === id);
    if (company && company.filial) {
        setFilial(company.filial);
    }
  }

  function handleFilialBlur() {
    if (!empresaSelecionada || !filial.trim()) return;
    const digitsCnpj = String(empresaSelecionada.cnpj || '').replace(/\D/g, '');
    const branch = digitsCnpj.slice(8, 12);
    const filialDigits = filial.replace(/\D/g, '').padStart(4, '0');
    if (filialDigits !== branch) {
      toast.error('Filial não encontrada');
    }
  }

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = formatCPF(e.target.value);
    setCpf(newValue);
    if (newValue.length === 14) {
      if (!validateCPF(newValue)) {
        setCpfError('CPF inválido');
      } else {
        setCpfError('');
      }
    } else {
      setCpfError('');
    }
  };

  const handleCpfBlur = () => {
    if (cpf.length > 0 && !validateCPF(cpf)) {
      setCpfError('CPF inválido');
    }
  };

  const isFormValid = !!selectedCompanyId && !!filial.trim() && !!nome.trim() && !!cpf.trim() && validateCPF(cpf) && !!participacao;

  async function handleSave() {
    if (!isFormValid) return;

    try {
      setIsSaving(true);
      const result = await saveSocio({
        id: initialData?.id,
        companyId: selectedCompanyId,
        nome,
        cpf,
        participacao: parseFloat(participacao),
        dataNascimento: dataNascimento ? format(dataNascimento, 'yyyy-MM-dd') : undefined,
        rg,
        orgaoExpedidor,
        ufOrgaoExpedidor,
        dataExpedicao: dataExpedicao ? format(dataExpedicao, 'yyyy-MM-dd') : undefined,
        cep,
        logradouroTipo,
        logradouro,
        numero,
        complemento,
        bairro,
        municipio,
        uf,
      });

      if (result.success) {
        toast.success(result.message);
        router.push('/admin/socios');
      } else {
        toast.error(result.message || 'Erro ao salvar sócio.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar sócio.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          {initialData ? 'Editar Sócio' : 'Novo Sócio'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Sócio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Empresa *</label>
            <div className="relative">
              <Popover open={openCompany} onOpenChange={setOpenCompany}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCompany}
                    className={cn(
                      "w-full justify-between font-normal",
                      !selectedCompanyId && "text-muted-foreground"
                    )}
                  >
                    {selectedCompanyId
                      ? companies.find((company) => company.id === selectedCompanyId)?.razao_social
                      : "Selecione a empresa"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <div className="flex flex-col">
                    <div className="flex items-center border-b px-3">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      <Input
                        placeholder="Digite 3 caracteres..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                      />
                    </div>
                    
                    <ScrollArea className="max-h-[300px] overflow-y-auto">
                      <div className="p-1">
                        {searchTerm.length >= 3 ? (
                          <>
                            {companies
                              .filter(company => 
                                company.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                company.cnpj.includes(searchTerm)
                              )
                              .length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  Nenhuma empresa encontrada.
                                </div>
                              )}

                            {companies
                              .filter(company => 
                                company.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                company.cnpj.includes(searchTerm)
                              )
                              .slice(0, 50)
                              .map((company) => (
                                <div
                                  key={company.id}
                                  onClick={() => {
                                    handleEmpresaChange(company.id);
                                    setOpenCompany(false);
                                  }}
                                  className={cn(
                                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                    company.id === selectedCompanyId && "bg-accent text-accent-foreground"
                                  )}
                                >
                                  <div className="w-full">
                                    <div className="flex w-full justify-between items-center">
                                      <span className="font-medium">{company.razao_social}</span>
                                      {company.id === selectedCompanyId && <Check className="h-4 w-4" />}
                                    </div>
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                      <span>CNPJ: {company.cnpj}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </>
                        ) : (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Digite pelo menos 3 caracteres para pesquisar...
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Filial *</label>
            <Input
              value={filial}
              onChange={(e) => setFilial(e.target.value)}
              onBlur={handleFilialBlur}
              placeholder="0001"
              maxLength={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nome completo do sócio *</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">CPF *</label>
            <Input
              value={cpf}
              onChange={handleCpfChange}
              onBlur={handleCpfBlur}
              disabled={socioFieldsDisabled}
              maxLength={14}
              className={cpfError ? 'border-red-500' : ''}
            />
            {cpfError && <p className="text-xs text-red-500">{cpfError}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Participação (%)</label>
            <Input
              type="number"
              value={participacao}
              onChange={(e) => setParticipacao(e.target.value)}
              onBlur={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val)) {
                  setParticipacao(val.toFixed(2));
                }
              }}
              step="0.01"
              min="0"
              max="100"
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data de nascimento</label>
            <DatePicker
              date={dataNascimento}
              setDate={setDataNascimento}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">RG</label>
            <Input
              value={rg}
              onChange={(e) => setRg(e.target.value.toUpperCase())}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Orgão Expedidor</label>
            <Input
              value={orgaoExpedidor}
              onChange={(e) => setOrgaoExpedidor(e.target.value.toUpperCase())}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">UF Org. Exp</label>
            <Input
              value={ufOrgaoExpedidor}
              onChange={(e) => setUfOrgaoExpedidor(e.target.value.toUpperCase())}
              maxLength={2}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Data de Expedição</label>
            <DatePicker
              date={dataExpedicao}
              setDate={setDataExpedicao}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">CEP</label>
            <Input
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Logradouro</label>
            <Input
              value={logradouroTipo}
              onChange={(e) => setLogradouroTipo(e.target.value)}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Logradouro</label>
            <Input
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Número</label>
            <Input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Complemento</label>
            <Input
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bairro</label>
            <Input
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Município</label>
            <Input
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">UF</label>
            <Input
              value={uf}
              onChange={(e) => setUf(e.target.value.toUpperCase())}
              maxLength={2}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="flex justify-end pt-6 gap-4">
            <Button variant="outline" onClick={() => router.push('/admin/socios')} disabled={isSaving}>
              Cancelar
            </Button>
            <Button disabled={isSaving || !isFormValid} onClick={handleSave}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
