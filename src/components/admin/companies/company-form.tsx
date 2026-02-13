'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCompany, updateCompany } from '@/app/actions/companies';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ChevronLeft, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { validateCNPJ } from '@/lib/validators';

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
}

interface CompanyFormProps {
  company?: Company | null;
  hasLinkedRecords?: boolean;
}

export function CompanyForm({ company, hasLinkedRecords = false }: CompanyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cnpjValue, setCnpjValue] = useState(company?.cnpj || '');
  const [cnpjError, setCnpjError] = useState('');
  const [cepValue, setCepValue] = useState(company?.address_zip_code || '');
  const [date, setDate] = useState<Date | undefined>(
    company?.data_abertura ? new Date(company.data_abertura + 'T12:00:00') : undefined
  );

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
            <Input name="address_type" placeholder="Ex: Rua, Av, Alameda" defaultValue={company?.address_type || ''} className="w-[16ch]" />
          </div>

          {/* Logradouro */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Logradouro</label>
            <Input name="address_street" defaultValue={company?.address_street || ''} className="w-[80ch]" />
          </div>

          {/* Número */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Número</label>
            <Input name="address_number" defaultValue={company?.address_number || ''} className="w-[12ch]" />
          </div>

          {/* Complemento */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Complemento</label>
            <Input name="address_complement" defaultValue={company?.address_complement || ''} className="w-[20ch]" />
          </div>

          {/* Bairro */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Bairro</label>
            <Input name="address_neighborhood" defaultValue={company?.address_neighborhood || ''} className="w-[30ch]" />
          </div>

          {/* Município */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Município</label>
            <Input name="municipio" defaultValue={company?.municipio || ''} className="w-[50ch]" />
          </div>

          {/* Estado */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Estado</label>
            <Input name="uf" maxLength={2} defaultValue={company?.uf || ''} className="w-[8ch]" />
          </div>

          {/* CEP */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">CEP</label>
            <Input 
              name="address_zip_code" 
              value={cepValue} 
              onChange={handleCepChange}
              placeholder="00000-000"
              maxLength={9}
              className="w-[15ch]"
            />
          </div>

          {/* E-mail */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">E-mail</label>
            <Input name="email_contato" type="email" defaultValue={company?.email_contato || ''} className="w-[50ch]" />
          </div>

          {/* Telefone */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4">
            <label className="text-sm font-medium">Telefone</label>
            <Input name="telefone" defaultValue={company?.telefone || ''} className="w-[20ch]" />
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
