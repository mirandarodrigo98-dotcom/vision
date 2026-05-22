'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import {
  createEDocDocument,
  type EDocCreateCategory,
  type EDocCreateModule,
} from '@/app/actions/edoc';
import { EDocCompanySelector, type EDocSelectedCompany } from '@/components/edoc/edoc-company-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type EDocCreateFormProps = {
  catalog: EDocCreateModule[];
  selectedCategoryId?: string;
};

function findCategory(catalog: EDocCreateModule[], categoryId?: string) {
  if (!categoryId) return null;
  return catalog.flatMap((module) => module.categories).find((category) => category.id === categoryId) || null;
}

function defaultTitleFromSuggestion(category: EDocCreateCategory | null) {
  return category?.suggestions[0]?.subject || '';
}

function defaultObservationFromSuggestion(category: EDocCreateCategory | null) {
  return category?.suggestions[0]?.observation || '';
}

export function EDocCreateForm({ catalog, selectedCategoryId }: EDocCreateFormProps) {
  const router = useRouter();
  const category = React.useMemo(() => findCategory(catalog, selectedCategoryId), [catalog, selectedCategoryId]);
  const [company, setCompany] = React.useState<EDocSelectedCompany | null>(null);
  const [title, setTitle] = React.useState(defaultTitleFromSuggestion(category));
  const [observation, setObservation] = React.useState(defaultObservationFromSuggestion(category));
  const [selectedSuggestion, setSelectedSuggestion] = React.useState('manual');
  const [dynamicValues, setDynamicValues] = React.useState<Record<string, string>>({});
  const [file, setFile] = React.useState<File | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setTitle(defaultTitleFromSuggestion(category));
    setObservation(defaultObservationFromSuggestion(category));
    setSelectedSuggestion(category?.suggestions.length ? '0' : 'manual');
    setDynamicValues({});
    setFile(null);
  }, [category]);

  function updateSuggestion(value: string) {
    setSelectedSuggestion(value);

    if (!category || value === 'manual') {
      return;
    }

    const suggestionIndex = Number(value);
    const suggestion = category.suggestions[suggestionIndex];
    if (!suggestion) return;

    setTitle(suggestion.subject || '');
    setObservation(suggestion.observation || '');
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!category) {
      toast.error('Selecione o tipo de documento antes de prosseguir.');
      return;
    }

    if (!company?.cnpj) {
      toast.error('Selecione o cliente do documento.');
      return;
    }

    if (!title.trim()) {
      toast.error('Informe o assunto do documento.');
      return;
    }

    if (!file) {
      toast.error('Selecione um arquivo para envio.');
      return;
    }

    startTransition(() => {
      const formData = new FormData();
      formData.append('categoryId', category.id);
      formData.append('companyCnpj', company.cnpj);
      formData.append('title', title);
      formData.append('observation', observation);
      formData.append('file', file);

      for (const field of category.fields) {
        formData.append(field.key, dynamicValues[field.key] || '');
      }

      void createEDocDocument(formData).then((result) => {
        if (!result.success) {
          toast.error(result.error || 'Nao foi possivel cadastrar o documento.');
          return;
        }

        toast.success(result.message || 'Documento cadastrado com sucesso.');
        router.push('/admin/edoc/enviados');
        router.refresh();
      });
    });
  }

  if (!category) {
    return (
      <Card className="max-w-3xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>e-Doc - Cadastrar Documento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Nenhum tipo foi selecionado ainda. Volte ao módulo `e-Doc` e use o popup `Cadastrar` para escolher a
            categoria e o documento.
          </p>
          <Link href="/admin/edoc">
            <Button variant="outline">Voltar ao modulo e-Doc</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-slate-500">Inicio / e-Doc / Cadastrar Documento</p>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cadastrar Documento</h1>
          <p className="mt-2 text-sm text-slate-500">
            Formulario dinamico baseado nos campos retornados pela API do Questor Zen para {category.moduleLabel} /
            {' '}
            {category.label}.
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-[#2d74b7] to-[#4c9be0] text-white">
          <CardTitle>Dados do Documento</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <EDocCompanySelector value={company} onSelect={setCompany} />
                <p className="text-xs text-slate-500">
                  Somente sera exibido cliente com acesso permitido ao modulo.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input value={category.moduleLabel} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Input value={category.label} disabled />
                </div>
              </div>
            </div>

            {category.suggestions.length > 0 && (
              <div className="space-y-2">
                <Label>Sugestao da API</Label>
                <Select value={selectedSuggestion} onValueChange={updateSuggestion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar sugestao" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Preenchimento manual</SelectItem>
                    {category.suggestions.map((suggestion, index) => (
                      <SelectItem key={`${suggestion.subject}-${index}`} value={String(index)}>
                        {suggestion.subject || `Sugestao ${index + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Assunto *</Label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Observacoes</Label>
                <Textarea value={observation} onChange={(event) => setObservation(event.target.value)} rows={3} />
              </div>
            </div>

            {category.fields.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {category.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </Label>
                    <Input
                      type={field.inputType === 'currency' ? 'number' : field.inputType}
                      step={field.inputType === 'currency' ? '0.01' : undefined}
                      value={dynamicValues[field.key] || ''}
                      onChange={(event) =>
                        setDynamicValues((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Arquivo *</Label>
              <FileUpload value={file} onChange={setFile} label="Selecionar arquivo" />
              <p className="text-xs text-slate-500">
                O arquivo sera enviado primeiro ao Questor Zen e depois vinculado ao documento cadastrado.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Link href="/admin/edoc">
                <Button type="button" variant="outline">
                  Voltar
                </Button>
              </Link>
              <Button type="submit" className="bg-[#3b82c4] hover:bg-[#326fa6]" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Cadastrar Documento
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
