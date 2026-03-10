import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';

interface CompanyDataTabProps {
  company: any;
  hasLinkedRecords: boolean;
  cnpjValue: string;
  setCnpjValue: (value: string) => void;
  cnpjError: string;
  handleCnpjChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCnpjBlur: () => void;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  typeRef: React.RefObject<HTMLInputElement>;
  streetRef: React.RefObject<HTMLInputElement>;
  complementRef: React.RefObject<HTMLInputElement>;
  neighborhoodRef: React.RefObject<HTMLInputElement>;
  municipalityRef: React.RefObject<HTMLInputElement>;
  ufRef: React.RefObject<HTMLInputElement>;
  cepValue: string;
  setCepValue: (value: string) => void;
  handleCepChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  lookupCep: () => void;
  cepLoading: boolean;
}

export function CompanyDataTab({
  company,
  hasLinkedRecords,
  cnpjValue,
  cnpjError,
  handleCnpjChange,
  handleCnpjBlur,
  date,
  setDate,
  typeRef,
  streetRef,
  complementRef,
  neighborhoodRef,
  municipalityRef,
  ufRef,
  cepValue,
  handleCepChange,
  lookupCep,
  cepLoading,
}: CompanyDataTabProps) {
  const [capitalSocialDisplay, setCapitalSocialDisplay] = useState('');
  const [capitalSocialCentavos, setCapitalSocialCentavos] = useState(0);

  // Address State (Controlled Components)
  const [addressType, setAddressType] = useState(company?.address_type || '');
  const [addressStreet, setAddressStreet] = useState(company?.address_street || '');
  const [addressNumber, setAddressNumber] = useState(company?.address_number || '');
  const [addressComplement, setAddressComplement] = useState(company?.address_complement || '');
  const [addressNeighborhood, setAddressNeighborhood] = useState(company?.address_neighborhood || '');
  const [municipality, setMunicipality] = useState(company?.municipio || '');
  const [uf, setUf] = useState(company?.uf || '');
  const [telefone, setTelefone] = useState(company?.telefone || '');
  const [email, setEmail] = useState(company?.email_contato || '');
  const [nome, setNome] = useState(company?.nome || '');
  const [razaoSocial, setRazaoSocial] = useState(company?.razao_social || '');
  const [filial, setFilial] = useState(company?.filial || '');
  const [code, setCode] = useState(company?.code || '');

  useEffect(() => {
    if (company?.capital_social_centavos !== undefined && company?.capital_social_centavos !== null) {
      const centavos = Number(company.capital_social_centavos);
      setCapitalSocialCentavos(centavos);
      setCapitalSocialDisplay((centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  }, [company?.capital_social_centavos]);

  // Update all fields when company object changes (e.g. after import)
  useEffect(() => {
    if (company) {
      setAddressType(company.address_type || '');
      setAddressStreet(company.address_street || '');
      setAddressNumber(company.address_number || '');
      setAddressComplement(company.address_complement || '');
      setAddressNeighborhood(company.address_neighborhood || '');
      setMunicipality(company.municipio || '');
      setUf(company.uf || '');
      setTelefone(company.telefone || '');
      setEmail(company.email_contato || '');
      setNome(company.nome || '');
      setRazaoSocial(company.razao_social || '');
      setFilial(company.filial || '');
      setCode(company.code || '');
    }
  }, [company]);

  const handleCapitalSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    const centavos = parseInt(value || '0', 10);
    setCapitalSocialCentavos(centavos);
    
    // Format for display
    const display = (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setCapitalSocialDisplay(display);
  };

  return (
    <div className="space-y-4 py-4">
      {/* Código */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
        <label className="text-sm font-medium">Código *</label>
        <div className="space-y-1">
          <Input 
            name="code" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
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
        <label className="text-sm font-medium">Filial *</label>
        <Input 
          name="filial" 
          value={filial}
          onChange={(e) => setFilial(e.target.value)}
          required
          className="w-[8ch]" 
          placeholder="Ex: 1"
        />
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
        <Input 
            name="razao_social" 
            value={razaoSocial} 
            onChange={(e) => setRazaoSocial(e.target.value)}
            className="w-[80ch]" 
        />
      </div>

      {/* Nome Fantasia */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
        <label className="text-sm font-medium">Nome Fantasia *</label>
        <Input 
            name="nome" 
            value={nome} 
            onChange={(e) => setNome(e.target.value)}
            required 
            className="w-[20ch]" 
        />
      </div>

      {/* Capital Social */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
        <label className="text-sm font-medium">Capital Social</label>
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
            <Input 
              className="w-[20ch] pl-9 text-right"
              placeholder="0,00"
              value={capitalSocialDisplay}
              onChange={handleCapitalSocialChange}
            />
            <input type="hidden" name="capital_social_centavos" value={capitalSocialCentavos} />
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <h3 className="font-semibold mb-4">Endereço</h3>
        
        {/* CEP */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">CEP</label>
          <div className="flex gap-2 items-center">
            <Input 
              name="address_zip_code" 
              value={cepValue} 
              onChange={handleCepChange}
              placeholder="00000-000"
              maxLength={9}
              className="w-[12ch]"
            />
            <button
              type="button"
              onClick={lookupCep}
              disabled={cepLoading}
              className="text-sm bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-2 rounded-md disabled:opacity-50"
            >
              {cepLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        {/* Tipo Logradouro */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">Tipo Logradouro</label>
          <Input 
            ref={typeRef} 
            name="address_type" 
            placeholder="Ex: Rua, Av, Alameda" 
            value={addressType} 
            onChange={(e) => setAddressType(e.target.value)}
            className="w-[16ch]" 
          />
        </div>

        {/* Logradouro */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">Logradouro</label>
          <Input 
            ref={streetRef} 
            name="address_street" 
            value={addressStreet} 
            onChange={(e) => setAddressStreet(e.target.value)}
            className="w-[80ch]" 
          />
        </div>

        {/* Número */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">Número</label>
          <Input 
            name="address_number" 
            value={addressNumber} 
            onChange={(e) => setAddressNumber(e.target.value)}
            className="w-[12ch]" 
          />
        </div>

        {/* Complemento */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">Complemento</label>
          <Input 
            ref={complementRef} 
            name="address_complement" 
            value={addressComplement} 
            onChange={(e) => setAddressComplement(e.target.value)}
            className="w-[20ch]" 
          />
        </div>

        {/* Bairro */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">Bairro</label>
          <Input 
            ref={neighborhoodRef} 
            name="address_neighborhood" 
            value={addressNeighborhood} 
            onChange={(e) => setAddressNeighborhood(e.target.value)}
            className="w-[30ch]" 
          />
        </div>

        {/* Município */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">Município</label>
          <Input 
            ref={municipalityRef} 
            name="municipio" 
            value={municipality} 
            onChange={(e) => setMunicipality(e.target.value)}
            className="w-[30ch]" 
          />
        </div>

        {/* UF */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">UF</label>
          <Input 
            ref={ufRef} 
            name="uf" 
            value={uf} 
            onChange={(e) => setUf(e.target.value)}
            maxLength={2} 
            className="w-[6ch] uppercase" 
          />
        </div>

        <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-4">Contato Geral</h3>
            {/* Telefone */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
                <label className="text-sm font-medium">Telefone Principal</label>
                <Input 
                    name="telefone" 
                    value={telefone} 
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-[20ch]" 
                />
            </div>

            {/* Email */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
                <label className="text-sm font-medium">E-mail Principal</label>
                <Input 
                    name="email_contato" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-[40ch]" 
                />
            </div>
        </div>
      </div>
    </div>
  );
}