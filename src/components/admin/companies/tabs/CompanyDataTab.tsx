
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
  return (
    <div className="space-y-4 py-4">
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

      {/* Capital Social */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
        <label className="text-sm font-medium">Capital Social</label>
        <Input 
          name="capital_social_centavos" 
          defaultValue={company?.capital_social_centavos || ''} 
          className="w-[20ch]"
          placeholder="Em centavos"
          type="number"
        />
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
              className="text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-2 rounded-md disabled:opacity-50"
            >
              {cepLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        {/* Tipo Logradouro */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">Tipo Logradouro</label>
          <Input ref={typeRef} name="address_type" placeholder="Ex: Rua, Av, Alameda" defaultValue={company?.address_type || ''} className="w-[16ch]" />
        </div>

        {/* Logradouro */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">Logradouro</label>
          <Input ref={streetRef} name="address_street" defaultValue={company?.address_street || ''} className="w-[80ch]" />
        </div>

        {/* Número */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">Número</label>
          <Input name="address_number" defaultValue={company?.address_number || ''} className="w-[12ch]" />
        </div>

        {/* Complemento */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">Complemento</label>
          <Input ref={complementRef} name="address_complement" defaultValue={company?.address_complement || ''} className="w-[20ch]" />
        </div>

        {/* Bairro */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">Bairro</label>
          <Input ref={neighborhoodRef} name="address_neighborhood" defaultValue={company?.address_neighborhood || ''} className="w-[30ch]" />
        </div>

        {/* Município */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">Município</label>
          <Input ref={municipalityRef} name="municipio" defaultValue={company?.municipio || ''} className="w-[30ch]" />
        </div>

        {/* UF */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
          <label className="text-sm font-medium">UF</label>
          <Input ref={ufRef} name="uf" defaultValue={company?.uf || ''} maxLength={2} className="w-[6ch] uppercase" />
        </div>

        <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-4">Contato Geral</h3>
            {/* Telefone */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
                <label className="text-sm font-medium">Telefone Principal</label>
                <Input name="telefone" defaultValue={company?.telefone || ''} className="w-[20ch]" />
            </div>

            {/* Email */}
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 mb-4">
                <label className="text-sm font-medium">E-mail Principal</label>
                <Input name="email_contato" defaultValue={company?.email_contato || ''} className="w-[40ch]" />
            </div>
        </div>
      </div>
    </div>
  );
}
