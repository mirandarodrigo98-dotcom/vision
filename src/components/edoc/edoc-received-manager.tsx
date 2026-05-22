'use client';

import * as React from 'react';
import {
  ChevronDown,
  ChevronRight,
  CircleSlash,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  MoreVertical,
  Printer,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  cancelEDocDocument,
  searchEDocReceivedDocuments,
  type EDocCategoryNode,
  type EDocSentDocument,
  type EDocSentFilters,
} from '@/app/actions/edoc';
import { EDocCompanySelector, type EDocSelectedCompany } from '@/components/edoc/edoc-company-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type EDocReceivedManagerProps = {
  initialCategories?: EDocCategoryNode[];
};

type FilterState = {
  status: 'all' | 'open' | 'archived' | 'canceled';
  dateMode: 'publication' | 'competence';
  startDate: string;
  endDate: string;
  company: EDocSelectedCompany | null;
  subject: string;
  typeIds: string[];
  author: string;
  dueDateStart: string;
  dueDateEnd: string;
  deadline: 'all' | 'overdue' | 'today' | 'upcoming' | 'without_due_date';
  comments: 'all' | 'with_comments' | 'without_comments';
};

const DEFAULT_FILTERS: FilterState = {
  status: 'all',
  dateMode: 'publication',
  startDate: '',
  endDate: '',
  company: null,
  subject: '',
  typeIds: [],
  author: '',
  dueDateStart: '',
  dueDateEnd: '',
  deadline: 'all',
  comments: 'all',
};

const STATUS_OPTIONS: Array<{ value: FilterState['status']; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Em Aberto' },
  { value: 'archived', label: 'Arquivados' },
  { value: 'canceled', label: 'Cancelados' },
];

function flattenTypeIds(categories: EDocCategoryNode[]) {
  return categories.flatMap((category) => category.children.map((child) => child.id));
}

function getStatusClasses(statusGroup: EDocSentDocument['statusGroup']) {
  switch (statusGroup) {
    case 'archived':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    case 'canceled':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

export function EDocReceivedManager({ initialCategories = [] }: EDocReceivedManagerProps) {
  const [categories, setCategories] = React.useState<EDocCategoryNode[]>(initialCategories);
  const [draftFilters, setDraftFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [rows, setRows] = React.useState<EDocSentDocument[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState('10');
  const [pageCount, setPageCount] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [showMoreFilters, setShowMoreFilters] = React.useState(true);
  const [isPending, startTransition] = React.useTransition();

  const allTypeIds = React.useMemo(() => flattenTypeIds(categories), [categories]);

  const loadDocuments = React.useCallback((filters: FilterState, nextPage: number, nextPageSize: string) => {
    startTransition(() => {
      void searchEDocReceivedDocuments({
        status: filters.status,
        dateMode: filters.dateMode,
        startDate: filters.startDate,
        endDate: filters.endDate,
        dueDateStart: filters.dueDateStart,
        dueDateEnd: filters.dueDateEnd,
        companyId: filters.company?.id,
        companyName: filters.company?.name,
        companyDocument: filters.company?.cnpj,
        subject: filters.subject,
        author: filters.author,
        typeIds: filters.typeIds,
        comments: filters.comments,
        deadline: filters.deadline,
        page: nextPage,
        pageSize: Number(nextPageSize),
      } satisfies EDocSentFilters).then((result) => {
        if (!result.success) {
          toast.error(result.error || 'Nao foi possivel consultar os documentos recebidos.');
          setRows([]);
          setTotal(0);
          setPageCount(0);
          return;
        }

        setRows(result.items);
        setTotal(result.total);
        setPage(result.page);
        setPageCount(result.pageCount);
        if (result.availableTypes) {
          setCategories(result.availableTypes);
        }
      });
    });
  }, []);

  const handleApplyFilters = React.useCallback(() => {
    if (!draftFilters.startDate || !draftFilters.endDate) {
      toast.warning('Informe a data inicial e final antes de filtrar os documentos recebidos.');
      return;
    }

    setAppliedFilters(draftFilters);
    setHasSearched(true);
    setPage(1);
  }, [draftFilters]);

  const handleClearFilters = React.useCallback(() => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setRows([]);
    setTotal(0);
    setPage(1);
    setPageCount(0);
    setHasSearched(false);
    setCategories(initialCategories);
  }, [initialCategories]);

  React.useEffect(() => {
    if (!hasSearched) return;
    loadDocuments(appliedFilters, page, pageSize);
  }, [appliedFilters, hasSearched, loadDocuments, page, pageSize]);

  const toggleType = React.useCallback((typeId: string) => {
    setDraftFilters((current) => ({
      ...current,
      typeIds: current.typeIds.includes(typeId)
        ? current.typeIds.filter((item) => item !== typeId)
        : [...current.typeIds, typeId],
    }));
  }, []);

  const toggleCategory = React.useCallback((category: EDocCategoryNode) => {
    const childIds = category.children.map((child) => child.id);

    setDraftFilters((current) => {
      const allSelected = childIds.every((childId) => current.typeIds.includes(childId));

      return {
        ...current,
        typeIds: allSelected
          ? current.typeIds.filter((typeId) => !childIds.includes(typeId))
          : Array.from(new Set([...current.typeIds, ...childIds])),
      };
    });
  }, []);

  const handleCancel = React.useCallback((document: EDocSentDocument) => {
    startTransition(() => {
      void cancelEDocDocument(document.id).then((result) => {
        if (!result.success) {
          toast.error(result.error || 'Nao foi possivel cancelar o documento.');
          return;
        }

        toast.success(result.message || 'Documento cancelado com sucesso.');
        loadDocuments(appliedFilters, page, pageSize);
      });
    });
  }, [appliedFilters, loadDocuments, page, pageSize]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-slate-500">Inicio / e-Doc / Documentos Recebidos</p>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">e-Doc - Documentos Recebidos</h1>
          <p className="mt-2 text-sm text-slate-500">
            Painel do admin/operador para consultar documentos recebidos, com tipos carregados a partir da API.
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
            <Filter className="h-4 w-4 text-orange-500" />
            Filtros
            <span className="text-sm font-normal text-slate-500">
              Aplique o filtro para detalhar os documentos
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Status</Label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {STATUS_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={draftFilters.status === option.value ? 'default' : 'outline'}
                    className={cn(
                      'h-11 border-slate-300',
                      draftFilters.status === option.value && 'bg-[#3b82c4] hover:bg-[#326fa6]'
                    )}
                    onClick={() =>
                      setDraftFilters((current) => ({
                        ...current,
                        status: option.value,
                      }))
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Clientes</Label>
              <EDocCompanySelector
                value={draftFilters.company}
                onSelect={(company) =>
                  setDraftFilters((current) => ({
                    ...current,
                    company,
                  }))
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700">Tipos</Label>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-slate-700"
                  onClick={() =>
                    setDraftFilters((current) => ({
                      ...current,
                      typeIds: current.typeIds.length === allTypeIds.length ? [] : allTypeIds,
                    }))
                  }
                >
                  {draftFilters.typeIds.length === allTypeIds.length ? 'Limpar todos' : 'Marcar todos'}
                </button>
              </div>

              <div className="rounded-md border border-slate-200 bg-white">
                <ScrollArea className="h-[180px]">
                  <div className="space-y-3 p-3">
                    {categories.length === 0 && (
                      <div className="text-sm text-slate-500">
                        Os tipos serao carregados a partir da API quando voce aplicar o primeiro filtro.
                      </div>
                    )}

                    {categories.map((category) => {
                      const allChildrenSelected =
                        category.children.length > 0 &&
                        category.children.every((child) => draftFilters.typeIds.includes(child.id));

                      return (
                        <div key={category.id} className="space-y-2">
                          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
                            <Checkbox checked={allChildrenSelected} onCheckedChange={() => toggleCategory(category)} />
                            {category.label}
                          </label>
                          <div className="space-y-1 pl-6">
                            {category.children.map((child) => (
                              <label
                                key={child.id}
                                className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"
                              >
                                <Checkbox
                                  checked={draftFilters.typeIds.includes(child.id)}
                                  onCheckedChange={() => toggleType(child.id)}
                                />
                                {child.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="radio"
                    checked={draftFilters.dateMode === 'publication'}
                    onChange={() =>
                      setDraftFilters((current) => ({
                        ...current,
                        dateMode: 'publication',
                      }))
                    }
                  />
                  Data de Publicacao
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="radio"
                    checked={draftFilters.dateMode === 'competence'}
                    onChange={() =>
                      setDraftFilters((current) => ({
                        ...current,
                        dateMode: 'competence',
                      }))
                    }
                  />
                  Data Competencia
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-slate-500">Data inicial</Label>
                  <Input
                    type="date"
                    value={draftFilters.startDate}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex items-end justify-center pb-2 text-sm text-slate-500">a</div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-slate-500">Data final</Label>
                  <Input
                    type="date"
                    value={draftFilters.endDate}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        endDate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Assunto/Numero</Label>
              <div className="relative">
                <Input
                  value={draftFilters.subject}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="Assunto ou numero do documento"
                  className="pr-10"
                />
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={() => setShowMoreFilters((current) => !current)}
          >
            {showMoreFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {showMoreFilters ? 'Menos filtros' : 'Mais filtros'}
          </button>

          {showMoreFilters && (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Autor</Label>
                <Input
                  value={draftFilters.author}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      author: event.target.value,
                    }))
                  }
                  placeholder="Nome do usuario"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Data de Vencimento</Label>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
                  <Input
                    type="date"
                    value={draftFilters.dueDateStart}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        dueDateStart: event.target.value,
                      }))
                    }
                  />
                  <div className="flex items-center justify-center text-sm text-slate-500">a</div>
                  <Input
                    type="date"
                    value={draftFilters.dueDateEnd}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        dueDateEnd: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Prazos</Label>
                <Select
                  value={draftFilters.deadline}
                  onValueChange={(value: FilterState['deadline']) =>
                    setDraftFilters((current) => ({
                      ...current,
                      deadline: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="overdue">Vencidos</SelectItem>
                    <SelectItem value="today">Vence hoje</SelectItem>
                    <SelectItem value="upcoming">A vencer</SelectItem>
                    <SelectItem value="without_due_date">Sem vencimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Comentarios</Label>
                <Select
                  value={draftFilters.comments}
                  onValueChange={(value: FilterState['comments']) =>
                    setDraftFilters((current) => ({
                      ...current,
                      comments: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Selecionar</SelectItem>
                    <SelectItem value="with_comments">Com comentarios</SelectItem>
                    <SelectItem value="without_comments">Sem comentarios</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClearFilters} disabled={isPending}>
              <X className="mr-2 h-4 w-4" />
              Limpar
            </Button>
            <Button
              type="button"
              className="bg-[#3b82c4] hover:bg-[#326fa6]"
              onClick={handleApplyFilters}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
              Filtrar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl text-slate-900">e-Doc - Documentos Recebidos</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {hasSearched
                ? `${total} documento(s) encontrado(s) no filtro atual.`
                : 'Aplique o filtro para listar os documentos recebidos.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" disabled>
              <Printer className="mr-2 h-4 w-4" />
              Visualizar Impressao
            </Button>

            <Select value={pageSize} onValueChange={setPageSize}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Assunto</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Envio</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {!hasSearched && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-500">
                        <FileText className="h-10 w-10 text-slate-300" />
                        <div>
                          <p className="font-medium text-slate-700">Atenção!</p>
                          <p>Aplique o filtro para listar seus documentos.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {hasSearched && isPending && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      <div className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando documentos recebidos...
                      </div>
                    </td>
                  </tr>
                )}

                {hasSearched && !isPending && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      Nenhum documento encontrado para o filtro informado.
                    </td>
                  </tr>
                )}

                {hasSearched && !isPending && rows.map((document) => (
                  <tr key={document.id || `${document.code}-${document.title}`} className="border-t border-slate-200">
                    <td className="px-4 py-4 align-top font-semibold text-slate-700">
                      {document.code || '--'}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-1">
                        <div className="font-semibold uppercase text-slate-900">{document.title}</div>
                        <div className="text-slate-600">{document.companyName || document.recipients || '--'}</div>
                        <div className="text-xs italic text-slate-500">
                          Enviado por <span className="font-semibold text-slate-700">{document.createdBy || '--'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">{document.categoryLabel || '--'}</td>
                    <td className="px-4 py-4 align-top">
                      <Badge variant="outline" className={getStatusClasses(document.statusGroup)}>
                        {document.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 align-top text-slate-700">{document.sentAt || '--'}</td>
                    <td className="px-4 py-4 align-top text-slate-700">{document.dueAt || '--'}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                if (!document.fileId) {
                                  toast.warning('Esse documento nao possui arquivo disponivel para download.');
                                  return;
                                }

                                window.open(
                                  `/api/edoc/download?fileId=${encodeURIComponent(document.fileId)}&name=${encodeURIComponent(document.title)}`,
                                  '_blank',
                                  'noopener,noreferrer'
                                );
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={document.statusGroup === 'canceled'}
                              onClick={() => handleCancel(document)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <CircleSlash className="mr-2 h-4 w-4" />
                              Cancelar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasSearched && pageCount > 1 && (
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-slate-500">
                Pagina {page} de {pageCount}
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1 || isPending} onClick={() => setPage(1)}>
                  Primeiro
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || isPending}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount || isPending}
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                >
                  Proxima
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount || isPending}
                  onClick={() => setPage(pageCount)}
                >
                  Ultima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
