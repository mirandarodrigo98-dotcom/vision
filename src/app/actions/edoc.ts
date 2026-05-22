'use server';

import { revalidatePath } from 'next/cache';

import { getSession } from '@/lib/auth';
import {
  getQuestorZenConfig,
  getZenCategories,
} from '@/app/actions/integrations/questor-zen';

export type EDocCategoryNode = {
  id: string;
  label: string;
  children: EDocCategoryNode[];
};

export type EDocSentDocument = {
  id: string;
  code: string;
  title: string;
  companyName: string;
  companyDocument: string;
  createdBy: string;
  categoryId: string;
  categoryLabel: string;
  status: string;
  statusGroup: 'open' | 'archived' | 'canceled';
  sentAt: string;
  sentAtIso: string;
  competence: string;
  competenceIso: string;
  dueAt: string;
  dueAtIso: string;
  comments: string;
  recipients: string;
  fileId: string;
};

export type EDocSentFilters = {
  status: 'all' | 'open' | 'archived' | 'canceled';
  dateMode: 'publication' | 'competence';
  startDate?: string;
  endDate?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
  companyId?: string;
  companyName?: string;
  companyDocument?: string;
  subject?: string;
  author?: string;
  typeIds?: string[];
  comments?: 'all' | 'with_comments' | 'without_comments';
  deadline?: 'all' | 'overdue' | 'today' | 'upcoming' | 'without_due_date';
  page?: number;
  pageSize?: number;
};

type EDocSearchResult = {
  success: boolean;
  items: EDocSentDocument[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  error?: string;
};

type QuestorZenCategory = {
  Codigo?: unknown;
  Descricao?: unknown;
  Categorias?: QuestorZenCategory[];
};

const FALLBACK_EDOC_CATEGORIES: EDocCategoryNode[] = [
  {
    id: '64b6d631273adf21d4750e07',
    label: 'Administrativo',
    children: [
      { id: '64b6d631273adf21d4750e08', label: 'Boletos', children: [] },
      { id: '64b6d631273adf21d4750e09', label: 'Contrato de Prestacao de Servico', children: [] },
      { id: '64b6d631273adf21d4750e0a', label: 'Notas de Servico', children: [] },
    ],
  },
  {
    id: '64b6d631273adf21d4750e0b',
    label: 'Contabilidade',
    children: [
      { id: '64b6d631273adf21d4750e0c', label: 'Demonstracoes Contabeis', children: [] },
      { id: '64b6d631273adf21d4750e0d', label: 'Outros Relatorios', children: [] },
    ],
  },
  {
    id: '64b6d631273adf21d4750e0e',
    label: 'Departamento Pessoal',
    children: [
      { id: '67f436285f0ded0f789e8a28', label: 'Admissao', children: [] },
      { id: '64b6d631273adf21d4750e0f', label: 'Demonstrativos', children: [] },
      { id: '64b6d631273adf21d4750e10', label: 'Documentos', children: [] },
      { id: '64b6d631273adf21d4750e11', label: 'Ferias', children: [] },
      { id: '64b6d631273adf21d4750e12', label: 'Guias', children: [] },
      { id: '64b6d631273adf21d4750e13', label: 'Recibos', children: [] },
      { id: '64b6d631273adf21d4750e14', label: 'Rescisoes', children: [] },
    ],
  },
  {
    id: '64b6d631273adf21d4750e15',
    label: 'Fiscal',
    children: [
      { id: '64b6d631273adf21d4750e16', label: 'Demonstracoes Tributarios', children: [] },
      { id: '64b6d631273adf21d4750e17', label: 'Guias Estaduais', children: [] },
      { id: '64b6d631273adf21d4750e18', label: 'Guias Federais', children: [] },
      { id: '64b6d631273adf21d4750e19', label: 'Guias Municipais', children: [] },
      { id: '64fb726c8bcddd134098e068', label: 'Nota Fiscal', children: [] },
    ],
  },
  {
    id: '64b6d631273adf21d4750e1a',
    label: 'Publicacoes Legais e Circulares',
    children: [
      { id: '64b6d631273adf21d4750e1b', label: 'Circulares', children: [] },
      { id: '64b6d631273adf21d4750e1c', label: 'Noticias', children: [] },
      { id: '64b6d631273adf21d4750e1d', label: 'Publicacoes Legais', children: [] },
    ],
  },
  {
    id: '64b6d631273adf21d4750e1e',
    label: 'Societario',
    children: [
      { id: '64d4d1388bcddd11305366ec', label: 'Alteracao Contratual', children: [] },
      { id: '64b6d631273adf21d4750e1f', label: 'Contrato Social', children: [] },
      { id: '657334228bcddd09f46af93c', label: 'Guias Legais', children: [] },
      { id: '67b9de098bcddd0bd87d2805', label: 'Inscricoes', children: [] },
      { id: '64d8e6568bcddd0db43164b3', label: 'Parcelamento', children: [] },
      { id: '64d8e7248bcddd0db43164b5', label: 'Parcelamento MEI', children: [] },
    ],
  },
];

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function digitsOnly(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

function buildZenApiUrl(baseUrl: string, token: string, path: string) {
  const base = baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}/api/v1/${token}${normalizedPath}`;
}

function parseJsonSafely(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function formatDateFromIso(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

function parseDateToIso(value: unknown) {
  const text = normalizeText(value);
  if (!text) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const dateOnly = text.split('T')[0]?.split(' ')[0] || '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return dateOnly;
  }

  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  return '';
}

function parseCompetenceToIso(value: string) {
  if (!value) return '';
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;

  const slashMatch = value.match(/^(\d{2})\/(\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[2]}-${slashMatch[1]}-01`;
  }

  const isoDate = parseDateToIso(value);
  if (isoDate) return isoDate.slice(0, 7) + '-01';

  return '';
}

function formatCompetence(month: string, year: string) {
  if (!month && !year) return '';
  const paddedMonth = month.padStart(2, '0');
  if (paddedMonth && year) return `${paddedMonth}/${year}`;
  return year || paddedMonth;
}

function getAttributeMap(rawAttributes: unknown) {
  const entries = Array.isArray(rawAttributes) ? rawAttributes : [];
  const map = new Map<string, string>();

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const rawName = normalizeText(record.Nome ?? record.Name);
    if (!rawName) continue;

    const normalizedKey = rawName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();

    map.set(normalizedKey, normalizeText(record.Valor ?? record.Value));
  }

  return map;
}

function firstNonEmpty(...values: unknown[]) {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) return normalized;
  }
  return '';
}

function getAttributeValue(attributeMap: Map<string, string>, keys: string[]) {
  for (const key of keys) {
    const normalizedKey = key
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();

    const value = attributeMap.get(normalizedKey);
    if (value) return value;
  }

  return '';
}

function normalizeStatus(rawStatus: string) {
  const normalized = rawStatus.toLowerCase();

  if (normalized.includes('cancel')) {
    return {
      label: 'Cancelado',
      group: 'canceled' as const,
    };
  }

  if (normalized.includes('archiv') || normalized.includes('arquiv')) {
    return {
      label: 'Arquivado',
      group: 'archived' as const,
    };
  }

  if (normalized === 'opened') {
    return {
      label: 'Em Aberto / Novo',
      group: 'open' as const,
    };
  }

  if (normalized === 'new') {
    return {
      label: 'Novo',
      group: 'open' as const,
    };
  }

  return {
    label: rawStatus || 'Em Aberto / Novo',
    group: 'open' as const,
  };
}

function normalizeCategoryTree(input: unknown): EDocCategoryNode[] {
  const modules = Array.isArray(input) ? input : [];

  const normalized = modules
    .map((module) => {
      if (!module || typeof module !== 'object') return null;
      const record = module as QuestorZenCategory;
      const id = normalizeText(record.Codigo);
      const label = normalizeText(record.Descricao);
      if (!id || !label) return null;

      const children = Array.isArray(record.Categorias)
        ? record.Categorias
            .map((child) => {
              const childId = normalizeText(child?.Codigo);
              const childLabel = normalizeText(child?.Descricao);
              if (!childId || !childLabel) return null;
              return {
                id: childId,
                label: childLabel,
                children: [],
              } satisfies EDocCategoryNode;
            })
            .filter(Boolean) as EDocCategoryNode[]
        : [];

      return {
        id,
        label,
        children,
      } satisfies EDocCategoryNode;
    })
    .filter(Boolean) as EDocCategoryNode[];

  return normalized.length > 0 ? normalized : FALLBACK_EDOC_CATEGORIES;
}

function extractDocumentItems(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.Items)) return record.Items;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.Documentos)) return record.Documentos;
    if (Array.isArray(record.documents)) return record.documents;
  }
  return [];
}

function normalizeDocument(raw: unknown): EDocSentDocument | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const attributeMap = getAttributeMap(record.Atributos ?? record.Attributes);

  const rawStatus = firstNonEmpty(record.Status, record.Situacao, record.DocumentStatus, record.State);
  const status = normalizeStatus(rawStatus);

  const publicationRaw = firstNonEmpty(
    getAttributeValue(attributeMap, ['DataPublicacao', 'DatePublication']),
    record.DataPublicacao,
    record.DatePublication,
    record.DataCriacao,
    record.CreatedAt
  );

  const dueRaw = firstNonEmpty(
    getAttributeValue(attributeMap, ['DataVencimento', 'DateExpire']),
    record.DataVencimento,
    record.DateExpire
  );

  const competenceRaw = firstNonEmpty(
    getAttributeValue(attributeMap, ['DataCompetencia', 'DateCompetence']),
    formatCompetence(
      getAttributeValue(attributeMap, ['MonthCompetence']),
      getAttributeValue(attributeMap, ['YearCompetence'])
    ),
    record.DataCompetencia,
    record.Competencia
  );

  const sentAtIso = parseDateToIso(publicationRaw);
  const dueAtIso = parseDateToIso(dueRaw);
  const competenceIso = parseCompetenceToIso(competenceRaw);

  const title = firstNonEmpty(record.Titulo, record.Title, record.Assunto, record.Subject);
  if (!title) return null;

  return {
    id: firstNonEmpty(record.Id, record.id),
    code: firstNonEmpty(record.Chave, record.Key, record.Code, record.Codigo),
    title,
    companyName: firstNonEmpty(
      record.ClienteNome,
      record.ClientName,
      record.CompanyName,
      record.EmpresaNome,
      record.Destinatarios,
      record.RecipientName
    ),
    companyDocument: digitsOnly(
      firstNonEmpty(
        record.ClienteDocumento,
        record.ClientDocument,
        record.CnpjCpfCliente,
        record.CnpjCliente
      )
    ),
    createdBy: firstNonEmpty(
      record.CriadoPorUsuarioNome,
      record.AuthorName,
      record.UsuarioCriacao,
      record.CreatedByName
    ),
    categoryId: firstNonEmpty(record.CategoriaId, record.IdCategoria),
    categoryLabel: firstNonEmpty(
      record.CategoriaDescricao,
      record.CategoryDescription,
      record.Tipo,
      record.TypeDescription
    ),
    status: status.label,
    statusGroup: status.group,
    sentAt: sentAtIso ? formatDateFromIso(sentAtIso) : normalizeText(publicationRaw),
    sentAtIso,
    competence: competenceRaw,
    competenceIso,
    dueAt: dueAtIso ? formatDateFromIso(dueAtIso) : normalizeText(dueRaw),
    dueAtIso,
    comments: firstNonEmpty(record.Observacao, record.Observation, record.Comments),
    recipients: firstNonEmpty(record.Destinatarios, record.Recipients),
    fileId: firstNonEmpty(record.Arquivo, record.File, record.FileId),
  };
}

function includesNormalized(source: string, search: string) {
  const normalizedSource = source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const normalizedSearch = search
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return normalizedSource.includes(normalizedSearch);
}

function applyClientSideFilters(items: EDocSentDocument[], filters: EDocSentFilters) {
  const today = new Date().toISOString().slice(0, 10);
  const selectedTypes = new Set(filters.typeIds || []);
  const companyDocument = digitsOnly(filters.companyDocument);
  const companyName = normalizeText(filters.companyName);
  const subject = normalizeText(filters.subject);
  const author = normalizeText(filters.author);

  return items
    .filter((item) => {
      if (filters.status === 'all') return true;
      return item.statusGroup === filters.status;
    })
    .filter((item) => {
      if (selectedTypes.size === 0) return true;
      return selectedTypes.has(item.categoryId);
    })
    .filter((item) => {
      if (!companyDocument && !companyName) return true;
      const matchesDocument = companyDocument ? digitsOnly(item.companyDocument).includes(companyDocument) : false;
      const matchesName = companyName ? includesNormalized(item.companyName, companyName) : false;
      return matchesDocument || matchesName;
    })
    .filter((item) => {
      if (!subject) return true;
      return includesNormalized(`${item.title} ${item.code}`, subject);
    })
    .filter((item) => {
      if (!author) return true;
      return includesNormalized(item.createdBy, author);
    })
    .filter((item) => {
      const targetDateIso = filters.dateMode === 'competence' ? item.competenceIso : item.sentAtIso;
      if (filters.startDate && (!targetDateIso || targetDateIso < filters.startDate)) return false;
      if (filters.endDate && (!targetDateIso || targetDateIso > filters.endDate)) return false;
      return true;
    })
    .filter((item) => {
      if (filters.dueDateStart && (!item.dueAtIso || item.dueAtIso < filters.dueDateStart)) return false;
      if (filters.dueDateEnd && (!item.dueAtIso || item.dueAtIso > filters.dueDateEnd)) return false;
      return true;
    })
    .filter((item) => {
      switch (filters.comments) {
        case 'with_comments':
          return Boolean(item.comments);
        case 'without_comments':
          return !item.comments;
        default:
          return true;
      }
    })
    .filter((item) => {
      switch (filters.deadline) {
        case 'overdue':
          return Boolean(item.dueAtIso) && item.dueAtIso < today;
        case 'today':
          return item.dueAtIso === today;
        case 'upcoming':
          return Boolean(item.dueAtIso) && item.dueAtIso > today;
        case 'without_due_date':
          return !item.dueAtIso;
        default:
          return true;
      }
    })
    .sort((left, right) => {
      const leftDate = left.sentAtIso || left.competenceIso || '';
      const rightDate = right.sentAtIso || right.competenceIso || '';
      return rightDate.localeCompare(leftDate);
    });
}

async function ensureAdminOrOperatorEdocAccess() {
  const session = await getSession();
  if (!session) {
    throw new Error('Sessao expirada. Faca login novamente.');
  }

  if (session.role !== 'admin' && session.role !== 'operator') {
    throw new Error('Acesso nao autorizado ao modulo e-Doc.');
  }

  return session;
}

export async function getEDocCategories(): Promise<EDocCategoryNode[]> {
  await ensureAdminOrOperatorEdocAccess();

  try {
    const categories = await getZenCategories();
    return normalizeCategoryTree(categories);
  } catch {
    return FALLBACK_EDOC_CATEGORIES;
  }
}

export async function searchEDocSentDocuments(filters: EDocSentFilters): Promise<EDocSearchResult> {
  try {
    await ensureAdminOrOperatorEdocAccess();

    if (!filters.startDate || !filters.endDate) {
      return {
        success: false,
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        pageCount: 0,
        error: 'Informe a data inicial e final para consultar os documentos enviados.',
      };
    }

    const config = await getQuestorZenConfig();
    if (!config) {
      return {
        success: false,
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        pageCount: 0,
        error: 'Configuracao do Questor Zen nao encontrada.',
      };
    }

    const categoryIds = (filters.typeIds || []).filter(Boolean);
    const requestCategories = categoryIds.length > 0 ? categoryIds : [''];
    const uniqueItems = new Map<string, EDocSentDocument>();

    for (const categoryId of requestCategories) {
      const response = await fetch(
        buildZenApiUrl(config.base_url, config.api_token, '/pegardocsedocqnet'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            DataInicio: filters.startDate,
            DataFinal: filters.endDate,
            ...(categoryId ? { IdCategoria: categoryId } : {}),
          }),
          cache: 'no-store',
        }
      );

      const responseText = await response.text();
      if (!response.ok) {
        return {
          success: false,
          items: [],
          total: 0,
          page: 1,
          pageSize: 10,
          pageCount: 0,
          error: `Questor Zen retornou erro ${response.status}: ${responseText}`,
        };
      }

      const parsed = parseJsonSafely(responseText);
      const items = extractDocumentItems(parsed);

      for (const rawItem of items) {
        const normalized = normalizeDocument(rawItem);
        if (!normalized) continue;

        const dedupeKey = normalized.id || `${normalized.code}-${normalized.title}-${normalized.sentAtIso}`;
        uniqueItems.set(dedupeKey, normalized);
      }
    }

    const filtered = applyClientSideFilters(Array.from(uniqueItems.values()), filters);
    const pageSize = Math.max(1, filters.pageSize || 10);
    const page = Math.max(1, filters.page || 1);
    const pageCount = filtered.length === 0 ? 0 : Math.ceil(filtered.length / pageSize);
    const safePage = pageCount > 0 ? Math.min(page, pageCount) : 1;
    const startIndex = (safePage - 1) * pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

    return {
      success: true,
      items: paginatedItems,
      total: filtered.length,
      page: safePage,
      pageSize,
      pageCount,
    };
  } catch (error) {
    return {
      success: false,
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Falha ao consultar documentos enviados do e-Doc.',
    };
  }
}

export async function cancelEDocDocument(documentId: string) {
  try {
    await ensureAdminOrOperatorEdocAccess();

    if (!documentId) {
      return { success: false, error: 'Documento invalido.' };
    }

    const config = await getQuestorZenConfig();
    if (!config) {
      return { success: false, error: 'Configuracao do Questor Zen nao encontrada.' };
    }

    const response = await fetch(
      buildZenApiUrl(config.base_url, config.api_token, `/cancelardocumento/${encodeURIComponent(documentId)}`),
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    const responseText = await response.text();
    const parsed = parseJsonSafely(responseText);
    const record = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;

    if (!response.ok || record?.success === false) {
      return {
        success: false,
        error:
          normalizeText(record?.message) ||
          normalizeText(record?.Message) ||
          `Falha ao cancelar documento (${response.status}).`,
      };
    }

    revalidatePath('/admin/edoc/enviados');

    return {
      success: true,
      message: normalizeText(record?.message) || normalizeText(record?.Message) || 'Documento cancelado com sucesso.',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Falha ao cancelar documento do e-Doc.',
    };
  }
}
