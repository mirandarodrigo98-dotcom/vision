'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { createEmployeeHistory, updateEmployeeHistory } from '@/app/actions/histories';
import { getEmployeesByCompany } from '@/app/actions/employees';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { EMPLOYEE_HISTORY_TYPES, getEmployeeHistoryTypeConfig } from '@/lib/employee-histories';

interface CompanyOption {
  id: string;
  nome: string;
  cnpj: string;
}

interface HistoryFormProps {
  companies: CompanyOption[];
  activeCompanyId?: string | null;
  initialData?: any;
  isEditing?: boolean;
  redirectPath?: string;
  readOnly?: boolean;
}

const parseDate = (value: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim().split('T')[0];
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return '';
};

export function HistoryForm({
  companies,
  activeCompanyId,
  initialData,
  isEditing = false,
  redirectPath = '/app/histories',
  readOnly = false,
}: HistoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialData?.company_id || activeCompanyId || '');
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialData?.employee_id || '');
  const [selectedType, setSelectedType] = useState(initialData?.request_type || EMPLOYEE_HISTORY_TYPES[0].value);
  const [effectiveDate, setEffectiveDate] = useState(parseDate(initialData?.effective_date));
  const [file, setFile] = useState<File | null>(null);

  const currentTypeConfig = useMemo(
    () => getEmployeeHistoryTypeConfig(selectedType),
    [selectedType]
  );

  useEffect(() => {
    if (!selectedCompanyId) {
      setEmployees([]);
      setSelectedEmployeeId('');
      return;
    }

    getEmployeesByCompany(selectedCompanyId).then((result) => {
      setEmployees(result);
      if (selectedCompanyId !== initialData?.company_id) {
        setSelectedEmployeeId('');
      }
    });
  }, [initialData?.company_id, selectedCompanyId]);

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 10MB.');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/zip',
      'application/x-rar-compressed',
      'application/vnd.rar',
      'image/png',
      'image/jpeg',
    ];

    const isRar = selectedFile.name.toLowerCase().endsWith('.rar');
    if (!allowedTypes.includes(selectedFile.type) && !isRar) {
      toast.error('Tipo de arquivo inválido. Apenas PDF, ZIP, RAR, PNG e JPG são permitidos.');
      return;
    }

    setFile(selectedFile);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    formData.set('company_id', selectedCompanyId);
    formData.set('request_type', selectedType);
    formData.set('effective_date', effectiveDate);

    if (file) {
      formData.set('attachment', file);
    }

    if (currentTypeConfig.attachmentRequired && !file && !initialData?.downloadLink) {
      toast.error('Esta solicitação exige o envio de um anexo.');
      setLoading(false);
      return;
    }

    try {
      const result = isEditing && initialData?.id
        ? await updateEmployeeHistory(initialData.id, formData)
        : await createEmployeeHistory(formData);

      if (result.success) {
        toast.success(isEditing ? 'Solicitação retificada com sucesso.' : 'Solicitação enviada com sucesso.');
        router.push(redirectPath);
        router.refresh();
      } else {
        toast.error(result.error || 'Erro ao salvar solicitação.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro inesperado ao salvar solicitação.');
    } finally {
      setLoading(false);
    }
  }

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>
          {readOnly
            ? 'Visualizar Solicitação de Histórico'
            : isEditing
              ? 'Retificar Solicitação de Histórico'
              : 'Nova Solicitação de Histórico'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={readOnly} className="space-y-6 border-none p-0 m-0 group-disabled:opacity-100">
            <input type="hidden" name="company_id" value={selectedCompanyId} />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input value={selectedCompany?.nome || initialData?.company_name || 'Empresa não selecionada'} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_id">Funcionário *</Label>
                {isEditing ? (
                  <>
                    <Input value={initialData?.employee_name || ''} disabled />
                    <input type="hidden" name="employee_id" value={initialData?.employee_id || ''} />
                  </>
                ) : (
                  <Select
                    name="employee_id"
                    required
                    value={selectedEmployeeId}
                    onValueChange={setSelectedEmployeeId}
                    disabled={!selectedCompanyId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={selectedCompanyId ? 'Selecione o funcionário' : 'Selecione a empresa primeiro'} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="request_type">Tipo da Solicitação *</Label>
                <Select
                  name="request_type"
                  required
                  value={selectedType}
                  onValueChange={setSelectedType}
                  disabled={readOnly}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo da solicitação" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_HISTORY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{currentTypeConfig.description}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="effective_date">{currentTypeConfig.effectiveDateLabel}</Label>
                <Input
                  id="effective_date"
                  name="effective_date"
                  type="date"
                  value={effectiveDate}
                  onChange={(event) => setEffectiveDate(event.target.value)}
                  disabled={readOnly}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_data">{currentTypeConfig.currentLabel}</Label>
              <Textarea
                id="current_data"
                name="current_data"
                defaultValue={initialData?.current_data || ''}
                placeholder={`Descreva ${currentTypeConfig.currentLabel.toLowerCase()}.`}
                disabled={readOnly}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requested_change">{currentTypeConfig.requestedLabel} *</Label>
              <Textarea
                id="requested_change"
                name="requested_change"
                defaultValue={initialData?.requested_change || ''}
                placeholder={`Descreva ${currentTypeConfig.requestedLabel.toLowerCase()}.`}
                disabled={readOnly}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="details">{currentTypeConfig.detailsLabel}</Label>
              <Textarea
                id="details"
                name="details"
                defaultValue={initialData?.details || ''}
                placeholder={`Inclua aqui informações complementares sobre ${currentTypeConfig.shortLabel.toLowerCase()}.`}
                disabled={readOnly}
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment">
                {currentTypeConfig.attachmentLabel}
                {currentTypeConfig.attachmentRequired ? ' *' : ''}
              </Label>

              {!readOnly ? (
                <div className="flex flex-col gap-2">
                  <FileUpload
                    id="attachment"
                    onChange={handleFileChange}
                    value={file}
                    accept=".pdf,.zip,.rar,.png,.jpg,.jpeg,application/pdf,application/zip,application/x-rar-compressed,application/vnd.rar,image/png,image/jpeg"
                  />
                  <p className="text-xs text-muted-foreground">
                    {currentTypeConfig.attachmentHint || 'Anexe documentos de apoio, se necessário.'}
                  </p>
                  {initialData?.downloadLink && !file && (
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
                  )}
                </div>
              ) : (
                <div className="p-3 border rounded bg-gray-50">
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
                {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Enviar Solicitação')}
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
