'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCompany, updateCompany } from '@/app/actions/companies';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código *</label>
              <Input 
                name="code" 
                defaultValue={company?.code || ''} 
                required 
                placeholder="Ex: 1"
                disabled={hasLinkedRecords}
              />
              {hasLinkedRecords ? (
                <p className="text-xs text-yellow-600">Código não pode ser alterado pois existem registros vinculados.</p>
              ) : (
                <p className="text-xs text-muted-foreground">O código deve ser único para cada empresa.</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">CNPJ *</label>
              <Input 
                name="cnpj" 
                value={cnpjValue} 
                onChange={handleCnpjChange}
                onBlur={handleCnpjBlur}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                required 
                className={cnpjError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                disabled={hasLinkedRecords}
              />
              {hasLinkedRecords && <p className="text-xs text-yellow-600 mt-1">CNPJ não pode ser alterado pois existem registros vinculados.</p>}
              {cnpjError && <p className="text-xs text-red-500 mt-1">{cnpjError}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nome Fantasia *</label>
            <Input name="nome" defaultValue={company?.nome} required />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Razão Social</label>
            <Input name="razao_social" defaultValue={company?.razao_social} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
              <label className="text-sm font-medium">Filial</label>
              <Input name="filial" defaultValue={company?.filial || ''} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Abertura</label>
              <Input name="data_abertura" type="date" defaultValue={company?.data_abertura || ''} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Município</label>
              <Input name="municipio" defaultValue={company?.municipio || ''} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">UF</label>
              <Input name="uf" maxLength={2} defaultValue={company?.uf || ''} />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone</label>
              <Input name="telefone" defaultValue={company?.telefone || ''} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Contato</label>
              <Input name="email_contato" type="email" defaultValue={company?.email_contato || ''} />
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
