import { getSession } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getRolePermissions } from '@/app/actions/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getProcessById, updateProcess } from '@/app/actions/societario-processes';
import { NewProcessFields } from '@/components/societario/new-process-fields';

export default async function EditProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');
  const perms = await getRolePermissions(session.role);
  if (!(perms.includes('societario.processes.edit') || perms.includes('societario.edit'))) {
    return <div className="p-6">Sem permissão</div>;
  }

  const result = await getProcessById(id);
  if (!result) notFound();
  const { process, socios, cnaes } = result as any;

  const displayRazao = process.razao_social || process.company_name || '-';
  const displayCnpj = process.company_cnpj || process.cnpj || '-';

  async function action(data: FormData) {
    'use server';
    return await updateProcess(data);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Editar Processo</h1>
        <div className="flex gap-2">
          <Link href={`/admin/societario/processos/${id}/view`}>
            <Button variant="outline">Visualizar</Button>
          </Link>
          <Link href="/admin/societario?tab=processos">
            <Button variant="outline">Voltar</Button>
          </Link>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{displayRazao}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={action} className="space-y-6">
            <input type="hidden" name="id" value={id} />
            <NewProcessFields
              initialCompanyId={process.company_id || ''}
              readonlyType
              initialValues={{
                id: process.id,
                type: process.type,
                company_id: process.company_id || '',
                razao_social: process.razao_social || '',
                nome_fantasia: process.nome_fantasia || '',
                capital_social_centavos: typeof process.capital_social_centavos === 'number' ? process.capital_social_centavos : null,
                socio_administrador: process.socio_administrador || '',
                objeto_social: process.objeto_social || '',
                telefone: process.telefone || '',
                email: process.email || '',
                observacao: process.observacao || '',
                natureza_juridica: process.natureza_juridica || '',
                porte: process.porte || '',
                tributacao: process.tributacao || '',
                inscricao_imobiliaria: process.inscricao_imobiliaria || '',
                compl_cep: process.compl_cep || '',
                compl_logradouro_tipo: process.compl_logradouro_tipo || '',
                compl_logradouro: process.compl_logradouro || '',
                compl_numero: process.compl_numero || '',
                compl_complemento: process.compl_complemento || '',
                compl_bairro: process.compl_bairro || '',
                compl_municipio: process.compl_municipio || '',
                compl_uf: process.compl_uf || '',
                socios: (socios || []).map((s: any) => ({
                  nome: s.nome || '',
                  cpf: s.cpf || '',
                  data_nascimento: null,
                  rg: s.rg || '',
                  cnh: s.cnh || '',
                  participacao_percent: typeof s.participacao_percent === 'number' ? s.participacao_percent : 0,
                  cep: s.cep || '',
                  logradouro_tipo: s.logradouro_tipo || '',
                  logradouro: s.logradouro || '',
                  numero: s.numero || '',
                  complemento: s.complemento || '',
                  bairro: s.bairro || '',
                  municipio: s.municipio || '',
                  uf: s.uf || '',
                })),
                cnaes: (cnaes || []).map((c: any) => ({ id: String(c.id), descricao: String(c.descricao) })),
              }}
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
