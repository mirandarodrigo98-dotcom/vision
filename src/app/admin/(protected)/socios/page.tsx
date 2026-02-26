import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { getRolePermissions } from '@/app/actions/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { useState } from 'react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';

async function getAllowed() {
  const session = await getSession();
  if (!session) return { allowed: false, companies: [] as any[] };
  const perms = await getRolePermissions(session.role);
  const canView =
    session.role === 'admin' ||
    perms.some((p) => p.permission === 'societario.view' || p.permission === 'societario.edit');
  if (!canView) return { allowed: false, companies: [] as any[] };

  const companies = await db
    .prepare(
      `
      SELECT id, razao_social, cnpj, code, filial
      FROM client_companies
      WHERE is_active = 1
      ORDER BY razao_social ASC
    `
    )
    .all();

  return { allowed: true, companies };
}

function SociosPageClient({ companies }: { companies: any[] }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [filial, setFilial] = useState('');
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState<Date | undefined>(undefined);
  const [rg, setRg] = useState('');
  const [orgaoExpedidor, setOrgaoExpedidor] = useState('');
  const [ufOrgaoExpedidor, setUfOrgaoExpedidor] = useState('');
  const [dataExpedicao, setDataExpedicao] = useState<Date | undefined>(undefined);
  const [cep, setCep] = useState('');
  const [logradouroTipo, setLogradouroTipo] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [uf, setUf] = useState('');

  const empresaSelecionada = companies.find((c) => c.id === selectedCompanyId) || null;
  const socioFieldsDisabled = !empresaSelecionada;

  function handleEmpresaChange(id: string) {
    setSelectedCompanyId(id);
  }

  function handleFilialBlur() {
    if (!empresaSelecionada || !filial.trim()) return;
    const digitsCnpj = String(empresaSelecionada.cnpj || '').replace(/\D/g, '');
    const base = digitsCnpj.slice(0, 8);
    const branch = digitsCnpj.slice(8, 12);
    const filialDigits = filial.replace(/\D/g, '').padStart(4, '0');
    if (filialDigits !== branch) {
      toast.error('Filial não encontrada');
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Sócios</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Sócio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Empresa</label>
            <div className="relative">
              <select
                className="border rounded h-10 px-3 w-full"
                value={selectedCompanyId}
                onChange={(e) => handleEmpresaChange(e.currentTarget.value)}
              >
                <option value="">Selecione a empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.code ? `${company.code} - ` : ''}
                    {company.razao_social}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Filial</label>
            <Input
              value={filial}
              onChange={(e) => setFilial(e.target.value)}
              onBlur={handleFilialBlur}
              placeholder="0001"
              maxLength={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nome completo do sócio</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              disabled={socioFieldsDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">CPF</label>
            <Input
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
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

          <div className="flex justify-end pt-4">
            <Button type="button" disabled>
              Salvar Sócio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function SociosPage() {
  const { allowed, companies } = await getAllowed();
  if (!allowed) {
    redirect('/admin/dashboard');
  }
  return <SociosPageClient companies={companies} />;
}

