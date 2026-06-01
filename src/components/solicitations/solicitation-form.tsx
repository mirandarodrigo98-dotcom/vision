'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { createSolicitation, updateSolicitation } from '@/app/actions/solicitations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CompanyOption {
  id: string;
  nome: string;
  cnpj: string;
}

interface RequestTypeOption {
  id: string;
  name: string;
  description?: string | null;
  department_name: string;
}

interface SolicitationFormProps {
  companies: CompanyOption[];
  activeCompanyId?: string | null;
  requestType: RequestTypeOption;
  initialData?: any;
  isEditing?: boolean;
  redirectPath?: string;
  readOnly?: boolean;
}

export function SolicitationForm({
  companies,
  activeCompanyId,
  requestType,
  initialData,
  isEditing = false,
  redirectPath = '/app/solicitations',
  readOnly = false,
}: SolicitationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const selectedCompany = companies.find((company) => company.id === (initialData?.company_id || activeCompanyId));

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('O arquivo deve ter no maximo 10MB.');
      return;
    }

    setFile(selectedFile);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    formData.set('company_id', String(initialData?.company_id || activeCompanyId || ''));
    formData.set('request_type_id', requestType.id);

    if (file) {
      formData.set('attachment', file);
    }

    try {
      const result = isEditing && initialData?.id
        ? await updateSolicitation(initialData.id, formData)
        : await createSolicitation(formData);

      if (result.success) {
        toast.success(isEditing ? 'Solicitacao retificada com sucesso.' : 'Solicitacao enviada com sucesso.');
        router.push(redirectPath);
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao salvar solicitacao.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro inesperado ao salvar solicitacao.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle>
          {readOnly
            ? 'Visualizar Solicitacao'
            : isEditing
              ? 'Retificar Solicitacao'
              : 'Nova Solicitacao'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={readOnly} className="space-y-6 border-none p-0">
            <input type="hidden" name="company_id" value={initialData?.company_id || activeCompanyId || ''} />
            <input type="hidden" name="request_type_id" value={requestType.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input value={selectedCompany?.nome || initialData?.company_name || 'Empresa nao selecionada'} disabled />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Solicitacao</Label>
                <Input value={requestType.name} disabled />
                <p className="text-xs text-muted-foreground">
                  Departamento responsavel: {requestType.department_name}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">{requestType.name}</p>
              <p className="text-sm text-muted-foreground">
                {requestType.description || 'Descreva abaixo os detalhes desta solicitacao.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Assunto *</Label>
              <Input
                id="subject"
                name="subject"
                defaultValue={initialData?.subject || ''}
                placeholder="Resumo rapido da solicitacao"
                required
                disabled={readOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">Detalhamento *</Label>
              <Textarea
                id="details"
                name="details"
                defaultValue={initialData?.details || ''}
                placeholder="Descreva aqui tudo o que o departamento precisa para atender a solicitacao."
                rows={7}
                required
                disabled={readOnly}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment">Anexo</Label>

              {!readOnly ? (
                <div className="flex flex-col gap-2">
                  <FileUpload
                    id="attachment"
                    onChange={handleFileChange}
                    value={file}
                    accept=".pdf,.zip,.rar,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  />
                  <p className="text-xs text-muted-foreground">
                    Anexe documentos de apoio, se necessario.
                  </p>
                  {initialData?.downloadLink && !file ? (
                    <p className="text-sm text-muted-foreground">
                      Arquivo atual:{' '}
                      <a
                        href={initialData.downloadLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Baixar documento existente
                      </a>
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded border bg-gray-50 p-3">
                  {initialData?.downloadLink ? (
                    <a
                      href={initialData.downloadLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      Baixar documento anexado
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">Nenhum documento anexado.</span>
                  )}
                </div>
              )}
            </div>
          </fieldset>

          {!readOnly ? (
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : (isEditing ? 'Salvar Alteracoes' : 'Enviar Solicitacao')}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Voltar
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
