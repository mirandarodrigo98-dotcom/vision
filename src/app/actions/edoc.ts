'use server';

import { revalidatePath } from 'next/cache';
import { load } from 'cheerio';

import { getSession } from '@/lib/auth';
import {
  fetchQuestorZenPortalDocumentDetailHtml,
  getZenClientByCnpj,
  getQuestorZenConfig,
  getZenCategories,
  sendDocumentToZen,
  uploadToZen,
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
  origin: string;
  typeKey: string;
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

export type EDocSearchResult = {
  success: boolean;
  items: EDocSentDocument[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  availableTypes?: EDocCategoryNode[];
  error?: string;
};

type QuestorZenCategory = {
  Codigo?: unknown;
  Descricao?: unknown;
  Categorias?: QuestorZenCategory[];
  Atributos?: unknown;
  CategoriaSugestoes?: unknown;
  DeadFile?: unknown;
};

export type EDocCreateSuggestion = {
  subject: string;
  observation: string;
};

export type EDocCreateField = {
  key: string;
  label: string;
  inputType: 'text' | 'date' | 'month' | 'currency';
  required: boolean;
};

export type EDocCreateCategory = {
  id: string;
  label: string;
  moduleId: string;
  moduleLabel: string;
  deadFile: boolean;
  fields: EDocCreateField[];
  suggestions: EDocCreateSuggestion[];
};

export type EDocCreateModule = {
  id: string;
  label: string;
  categories: EDocCreateCategory[];
};

export type EDocDocumentAttachment = {
  id: string;
  name: string;
};

export type EDocDocumentMovement = {
  title: string;
  description: string;
  time: string;
};

export type EDocDocumentDetail = {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  statusGroup: 'open' | 'archived' | 'canceled';
  companyName: string;
  companyDocument: string;
  author: string;
  competence: string;
  collaborator: string;
  createdAt: string;
  sentAt: string;
  dueAt: string;
  commentsCount: number;
  observation: string;
  origin: string;
  attachments: EDocDocumentAttachment[];
  movements: EDocDocumentMovement[];
  source: 'portal' | 'api-fallback';
  portalUrl?: string;
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

function slugify(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function digitsOnly(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

function buildZenApiUrl(baseUrl: string, token: string, path: string) {
  const base = baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}/api/v1/${token}${normalizedPath}`;
}

// #region debug-point A:reporter
function reportEdocDebug(hypothesisId: string, location: string, msg: string, data: Record<string, unknown>) {
  try {
    const fs = require('fs') as typeof import('fs');
    const envPath = '.dbg/edoc-empty-filter.env';
    let serverUrl = 'http://127.0.0.1:7777/event';
    let sessionId = 'edoc-empty-filter';
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      serverUrl = envContent.match(/DEBUG_SERVER_URL=(.+)/)?.[1]?.trim() || serverUrl;
      sessionId = envContent.match(/DEBUG_SESSION_ID=(.+)/)?.[1]?.trim() || sessionId;
    } catch {}
    void fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        runId: 'pre-fix',
        hypothesisId,
        location,
        msg: `[DEBUG] ${msg}`,
        data,
        ts: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
}
// #endregion

function stripTags(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

function inferFieldFromAttribute(label: string): EDocCreateField {
  const normalized = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('data de vencimento')) {
    return { key: 'DataVencimento', label, inputType: 'date', required: true };
  }

  if (normalized.includes('data de publicacao')) {
    return { key: 'DataPublicacao', label, inputType: 'date', required: true };
  }

  if (normalized.includes('data de competencia')) {
    return { key: 'DataCompetencia', label, inputType: 'month', required: true };
  }

  if (normalized.includes('valor')) {
    return { key: 'Valor', label, inputType: 'currency', required: true };
  }

  if (normalized.includes('tipo calculo')) {
    return { key: 'TipoCalculo', label, inputType: 'text', required: true };
  }

  if (normalized.includes('colaborador')) {
    return { key: 'Colaborador', label, inputType: 'text', required: true };
  }

  return {
    key: label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ''),
    label,
    inputType: 'text',
    required: true,
  };
}

function normalizeCreateCatalog(input: unknown): EDocCreateModule[] {
  const modules = Array.isArray(input) ? input : [];

  const normalized = modules
    .map((module) => {
      if (!module || typeof module !== 'object') return null;
      const record = module as QuestorZenCategory;
      const moduleId = normalizeText(record.Codigo);
      const moduleLabel = normalizeText(record.Descricao);
      if (!moduleId || !moduleLabel) return null;

      const categories = Array.isArray(record.Categorias)
        ? record.Categorias
            .map((category) => {
              const categoryId = normalizeText(category?.Codigo);
              const categoryLabel = normalizeText(category?.Descricao);
              if (!categoryId || !categoryLabel) return null;

              const attributes = Array.isArray(category?.Atributos)
                ? category.Atributos
                    .map((attribute) => normalizeText(attribute))
                    .filter(Boolean)
                : [];

              const suggestions = Array.isArray(category?.CategoriaSugestoes)
                ? category.CategoriaSugestoes
                    .map((item) => {
                      if (!item || typeof item !== 'object') return null;
                      const record = item as Record<string, unknown>;
                      return {
                        subject: normalizeText(record.Assunto),
                        observation: normalizeText(record.Observacao),
                      } satisfies EDocCreateSuggestion;
                    })
                    .filter((item): item is EDocCreateSuggestion => Boolean(item?.subject || item?.observation))
                : [];

              return {
                id: categoryId,
                label: categoryLabel,
                moduleId,
                moduleLabel,
                deadFile: Boolean(category?.DeadFile),
                fields: attributes.map((attribute) => inferFieldFromAttribute(attribute)),
                suggestions,
              } satisfies EDocCreateCategory;
            })
            .filter(Boolean) as EDocCreateCategory[]
        : [];

      return {
        id: moduleId,
        label: moduleLabel,
        categories,
      } satisfies EDocCreateModule;
    })
    .filter(Boolean) as EDocCreateModule[];

  if (normalized.length > 0) {
    return normalized;
  }

  return FALLBACK_EDOC_CATEGORIES.map((module) => ({
    id: module.id,
    label: module.label,
    categories: module.children.map((category) => ({
      id: category.id,
      label: category.label,
      moduleId: module.id,
      moduleLabel: module.label,
      deadFile: false,
      fields: [],
      suggestions: [],
    })),
  }));
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
  const origin = firstNonEmpty(
    getAttributeValue(attributeMap, ['Origem', 'Origin']),
    record.Origem,
    record.Origin
  );

  const title = firstNonEmpty(record.Titulo, record.Title, record.Assunto, record.Subject);
  if (!title) return null;

  const categoryId = firstNonEmpty(record.CategoriaId, record.IdCategoria);
  const categoryLabel = firstNonEmpty(
    record.CategoriaDescricao,
    record.CategoryDescription,
    record.Tipo,
    record.TypeDescription
  );
  const typeKey = categoryId || slugify(categoryLabel || title);

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
    categoryId,
    categoryLabel,
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
    origin,
    typeKey,
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

function normalizePlainLines(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function extractLabelValueFromLines(lines: string[], labels: string[]) {
  for (const line of lines) {
    for (const label of labels) {
      const pattern = new RegExp(`^${label}\\s*:\\s*(.+)$`, 'i');
      const match = line.match(pattern);
      if (match) {
        return normalizeText(match[1]);
      }
    }
  }

  return '';
}

function parseCommentsCount(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function buildDetailLookupFilters(): EDocSentFilters {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 5);

  return {
    status: 'all',
    dateMode: 'publication',
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    page: 1,
    pageSize: 500,
  };
}

function buildInitialTypeLookupFilters(): EDocSentFilters {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 3);

  return {
    status: 'all',
    dateMode: 'publication',
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    page: 1,
    pageSize: 500,
  };
}

function buildUnfilteredDateRange() {
  const endDate = new Date();
  return {
    startDate: '2000-01-01',
    endDate: endDate.toISOString().slice(0, 10),
  };
}

async function findEDocDocumentById(documentId: string, mode: 'sent' | 'received') {
  const lookup = buildDetailLookupFilters();
  const result = await fetchEDocDocumentsFromZen(lookup, ['']);
  if (!result.success) {
    throw new Error(result.error || 'Falha ao localizar documento no Questor Zen.');
  }

  const pool = mode === 'received' ? filterReceivedOrigin(result.items) : result.items;
  const byId = pool.find((item) => item.id === documentId);
  if (byId) return byId;

  const fallback = result.items.find((item) => item.id === documentId);
  if (fallback) return fallback;

  return null;
}

function buildFallbackDetailFromListItem(item: EDocSentDocument): EDocDocumentDetail {
  const collaborator =
    item.comments
      .split('\n')
      .map((line) => line.trim())
      .find((line) => includesNormalized(line, 'colaborador'))?.split(':').slice(1).join(':').trim() || '';

  return {
    id: item.id,
    code: item.code,
    title: item.title,
    type: item.categoryLabel,
    status: item.status,
    statusGroup: item.statusGroup,
    companyName: item.companyName,
    companyDocument: item.companyDocument,
    author: item.createdBy,
    competence: item.competence,
    collaborator,
    createdAt: item.sentAt,
    sentAt: item.sentAt,
    dueAt: item.dueAt,
    commentsCount: item.comments ? 1 : 0,
    observation: item.comments,
    origin: item.origin,
    attachments: item.fileId
      ? [
          {
            id: item.fileId,
            name: item.title || `documento-${item.code || item.id}`,
          },
        ]
      : [],
    movements: item.sentAt
      ? [
          {
            title: 'Documento listado no Zen',
            description: item.status,
            time: item.sentAt,
          },
        ]
      : [],
    source: 'api-fallback',
  };
}

function parsePortalDocumentDetail(html: string, fallback: EDocSentDocument, portalUrl?: string): EDocDocumentDetail {
  const $ = load(html);
  const plainText = $('body').text();
  const lines = normalizePlainLines(plainText);
  const attachments: EDocDocumentAttachment[] = [];
  const movementMap = new Map<string, EDocDocumentMovement>();

  $('a').each((_, element) => {
    const href = normalizeText($(element).attr('href'));
    const text = normalizeText($(element).text());
    if (!text) return;

    const fileIdMatch = href.match(/fileId=([^&]+)/i);
    if (fileIdMatch || /\.[a-z0-9]{2,5}$/i.test(text)) {
      const attachmentId = fileIdMatch ? decodeURIComponent(fileIdMatch[1]) : '';
      const key = `${attachmentId}-${text}`;
      if (!attachments.some((item) => `${item.id}-${item.name}` === key)) {
        attachments.push({
          id: attachmentId || fallback.fileId,
          name: text,
        });
      }
    }
  });

  $('tr').each((_, row) => {
    const cells = $(row)
      .find('td')
      .map((__, cell) => normalizeText($(cell).text()))
      .get()
      .filter(Boolean);

    if (cells.length === 0) return;

    const time = cells.find((cell) => /^\d{2}:\d{2}$/.test(cell)) || '';
    const description = cells.filter((cell) => cell !== time).join(' | ');
    if (!description) return;

    const title = cells[0] || 'Movimentacao';
    const key = `${title}-${description}-${time}`;
    if (!movementMap.has(key)) {
      movementMap.set(key, {
        title,
        description,
        time,
      });
    }
  });

  if (movementMap.size === 0) {
    const movementHeaderIndex = lines.findIndex((line) => includesNormalized(line, 'movimentacoes'));
    if (movementHeaderIndex >= 0) {
      for (const line of lines.slice(movementHeaderIndex + 1)) {
        if (
          includesNormalized(line, 'arquivos') ||
          includesNormalized(line, 'comentarios') ||
          includesNormalized(line, 'quem recebera')
        ) {
          break;
        }

        const timeMatch = line.match(/(\d{2}:\d{2})$/);
        const time = timeMatch?.[1] || '';
        const description = time ? line.replace(/\s+\d{2}:\d{2}$/, '').trim() : line;
        if (!description) continue;

        movementMap.set(`${description}-${time}`, {
          title: description.split(' - ')[0] || description,
          description,
          time,
        });
      }
    }
  }

  const commentValue = extractLabelValueFromLines(lines, ['Coment[aá]rio']);
  const observationValue = extractLabelValueFromLines(lines, ['Observa[cç][aã]o']);
  const competenceValue = extractLabelValueFromLines(lines, ['Compet[eê]ncia', 'Competencia']);
  const collaboratorValue = extractLabelValueFromLines(lines, ['Colaborador']);
  const createdAtValue = extractLabelValueFromLines(lines, ['Data Cria[cç][aã]o', 'Data Criacao']);
  const clientValue = extractLabelValueFromLines(lines, ['Cliente']);
  const authorValue = extractLabelValueFromLines(lines, ['Autor']);
  const statusValue = extractLabelValueFromLines(lines, ['Status']);
  const typeValue = extractLabelValueFromLines(lines, ['Tipo']);
  const idValue = extractLabelValueFromLines(lines, ['Id']);

  return {
    id: fallback.id,
    code: fallback.code || idValue,
    title: fallback.title,
    type: typeValue || fallback.categoryLabel,
    status: statusValue || fallback.status,
    statusGroup: fallback.statusGroup,
    companyName: clientValue || fallback.companyName,
    companyDocument: fallback.companyDocument,
    author: authorValue || fallback.createdBy,
    competence: competenceValue || fallback.competence,
    collaborator: collaboratorValue,
    createdAt: createdAtValue || fallback.sentAt,
    sentAt: fallback.sentAt,
    dueAt: fallback.dueAt,
    commentsCount: parseCommentsCount(commentValue),
    observation: stripTags(observationValue || fallback.comments),
    origin: fallback.origin,
    attachments: attachments.length > 0 ? attachments : buildFallbackDetailFromListItem(fallback).attachments,
    movements:
      Array.from(movementMap.values()).length > 0
        ? Array.from(movementMap.values())
        : buildFallbackDetailFromListItem(fallback).movements,
    source: 'portal',
    portalUrl,
  };
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
      return selectedTypes.has(item.typeKey || item.categoryId);
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

export async function getEDocCreateCatalog(): Promise<EDocCreateModule[]> {
  await ensureAdminOrOperatorEdocAccess();

  try {
    const categories = await getZenCategories();
    return normalizeCreateCatalog(categories);
  } catch {
    return normalizeCreateCatalog([]);
  }
}

export async function getEDocCategories(): Promise<EDocCategoryNode[]> {
  const catalog = await getEDocCreateCatalog();

  return catalog.map((module) => ({
    id: module.id,
    label: module.label,
    children: module.categories.map((category) => ({
      id: category.id,
      label: category.label,
      children: [],
    })),
  }));
}

export async function getEDocReceivedCategories(): Promise<EDocCategoryNode[]> {
  await ensureAdminOrOperatorEdocAccess();

  try {
    const result = await fetchEDocDocumentsFromZen(buildInitialTypeLookupFilters(), ['']);
    if (!result.success) {
      return [];
    }

    return buildReceivedTypeTree(filterReceivedOrigin(result.items));
  } catch {
    return [];
  }
}

async function getAllEDocCategoryIds() {
  try {
    const categories = await getZenCategories();
    const catalog = normalizeCreateCatalog(categories);
    const ids = catalog.flatMap((module) => module.categories.map((category) => category.id)).filter(Boolean);
    if (ids.length > 0) {
      return Array.from(new Set(ids));
    }
  } catch {
    // fallback abaixo
  }

  return Array.from(
    new Set(
      FALLBACK_EDOC_CATEGORIES.flatMap((module) => module.children.map((category) => category.id)).filter(Boolean)
    )
  );
}

async function fetchEDocDocumentsFromZen(filters: EDocSentFilters, requestCategoryIds?: string[]) {
  // #region debug-point A:server-entry
  reportEdocDebug('A', 'edoc.ts:fetchEDocDocumentsFromZen:entry', 'entrada da consulta ao Zen', {
    startDate: filters.startDate,
    endDate: filters.endDate,
    requestedCategoryCount: requestCategoryIds?.length || 0,
    dateMode: filters.dateMode,
  });
  // #endregion
  const fallbackRange = buildUnfilteredDateRange();
  const effectiveStartDate = filters.startDate || fallbackRange.startDate;
  const effectiveEndDate = filters.endDate || fallbackRange.endDate;

  if (!effectiveStartDate || !effectiveEndDate) {
    // #region debug-point A:missing-dates
    reportEdocDebug('A', 'edoc.ts:fetchEDocDocumentsFromZen:missing-dates', 'consulta abortada por falta de datas', {
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
    // #endregion
    return {
      success: false,
      items: [] as EDocSentDocument[],
      error: 'Informe a data inicial e final para consultar os documentos.',
    };
  }

  const config = await getQuestorZenConfig();
  if (!config) {
    return {
      success: false,
      items: [] as EDocSentDocument[],
      error: 'Configuracao do Questor Zen nao encontrada.',
    };
  }

  const categoryIds =
    requestCategoryIds && requestCategoryIds.length > 0 ? requestCategoryIds : await getAllEDocCategoryIds();
  // #region debug-point C:category-resolution
  reportEdocDebug('C', 'edoc.ts:fetchEDocDocumentsFromZen:categories', 'categorias resolvidas para consulta', {
    categoryCount: categoryIds.length,
    firstCategories: categoryIds.slice(0, 10),
  });
  // #endregion
  const uniqueItems = new Map<string, EDocSentDocument>();

  for (const categoryId of categoryIds) {
    const response = await fetch(
      buildZenApiUrl(config.base_url, config.api_token, '/pegardocsedocqnet'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          DataInicio: effectiveStartDate,
          DataFinal: effectiveEndDate,
          ...(categoryId ? { IdCategoria: categoryId } : {}),
        }),
        cache: 'no-store',
      }
    );

    const responseText = await response.text();
    if (!response.ok) {
      return {
        success: false,
        items: [] as EDocSentDocument[],
        error: `Questor Zen retornou erro ${response.status}: ${responseText}`,
      };
    }

    const parsed = parseJsonSafely(responseText);
    const items = extractDocumentItems(parsed);
    // #region debug-point B:zen-response
    reportEdocDebug('B', 'edoc.ts:fetchEDocDocumentsFromZen:response', 'resposta bruta do Zen recebida', {
      categoryId,
      responseOk: response.ok,
      responseStatus: response.status,
      rawItemCount: items.length,
    });
    // #endregion

    for (const rawItem of items) {
      const normalized = normalizeDocument(rawItem);
      if (!normalized) continue;

      const dedupeKey = normalized.id || `${normalized.code}-${normalized.title}-${normalized.sentAtIso}`;
      uniqueItems.set(dedupeKey, normalized);
    }
  }

  return {
    success: true,
    items: Array.from(uniqueItems.values()),
  };
}

function paginateDocuments(items: EDocSentDocument[], page?: number, pageSize?: number) {
  const safePageSize = Math.max(1, pageSize || 10);
  const safePage = Math.max(1, page || 1);
  const pageCount = items.length === 0 ? 0 : Math.ceil(items.length / safePageSize);
  const finalPage = pageCount > 0 ? Math.min(safePage, pageCount) : 1;
  const startIndex = (finalPage - 1) * safePageSize;

  return {
    page: finalPage,
    pageSize: safePageSize,
    pageCount,
    items: items.slice(startIndex, startIndex + safePageSize),
  };
}

function groupReceivedTypeLabel(label: string) {
  const normalized = slugify(label);

  if (
    normalized.includes('extrato') ||
    normalized.includes('comprovante') ||
    normalized.includes('contabil') ||
    normalized.includes('balancete') ||
    normalized.includes('demonstrac')
  ) {
    return 'Documentos Contabeis';
  }

  if (
    normalized.includes('folha') ||
    normalized.includes('rescis') ||
    normalized.includes('ferias') ||
    normalized.includes('laudo') ||
    normalized.includes('vale') ||
    normalized.includes('admiss') ||
    normalized.includes('atestado') ||
    normalized.includes('pagamento')
  ) {
    return 'Documentos Departamento Pessoal';
  }

  if (
    normalized.includes('nota') ||
    normalized.includes('fiscal') ||
    normalized.includes('imposto') ||
    normalized.includes('guia') ||
    normalized.includes('das')
  ) {
    return 'Documentos Fiscais';
  }

  if (
    normalized.includes('contrato') ||
    normalized.includes('boleto') ||
    normalized.includes('administr')
  ) {
    return 'Documentos Administrativos';
  }

  return 'Outros Documentos';
}

function buildReceivedTypeTree(items: EDocSentDocument[]): EDocCategoryNode[] {
  const grouped = new Map<string, Map<string, { id: string; label: string }>>();

  for (const item of items) {
    const typeLabel = item.categoryLabel || item.title;
    if (!typeLabel) continue;

    const groupLabel = groupReceivedTypeLabel(typeLabel);
    if (!grouped.has(groupLabel)) {
      grouped.set(groupLabel, new Map());
    }

    grouped.get(groupLabel)?.set(item.typeKey, {
      id: item.typeKey,
      label: typeLabel,
    });
  }

  return Array.from(grouped.entries())
    .map(([groupLabel, childrenMap]) => ({
      id: slugify(groupLabel),
      label: groupLabel,
      children: Array.from(childrenMap.values())
        .sort((left, right) => left.label.localeCompare(right.label))
        .map((child) => ({
          id: child.id,
          label: child.label,
          children: [],
        })),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function filterReceivedOrigin(items: EDocSentDocument[]) {
  const docsWithOrigin = items.filter((item) => item.origin);
  if (docsWithOrigin.length === 0) {
    return items;
  }

  const received = items.filter((item) => {
    if (!item.origin) return false;
    return includesNormalized(item.origin, 'cliente') || includesNormalized(item.origin, 'q-net');
  });

  return received.length > 0 ? received : items;
}

export async function searchEDocSentDocuments(filters: EDocSentFilters): Promise<EDocSearchResult> {
  try {
    await ensureAdminOrOperatorEdocAccess();

    const categoryIds = (filters.typeIds || []).filter(Boolean);
    const result = await fetchEDocDocumentsFromZen(filters, categoryIds.length > 0 ? categoryIds : ['']);
    if (!result.success) {
      return {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        pageCount: 0,
        success: false,
        error: result.error,
      };
    }

    const filtered = applyClientSideFilters(result.items, filters);
    // #region debug-point B:sent-after-filter
    reportEdocDebug('B', 'edoc.ts:searchEDocSentDocuments:after-filter', 'resultado de enviados apos filtro local', {
      rawCount: result.items.length,
      filteredCount: filtered.length,
      filters,
    });
    // #endregion
    const paginated = paginateDocuments(filtered, filters.page, filters.pageSize);

    return {
      success: true,
      items: paginated.items,
      total: filtered.length,
      page: paginated.page,
      pageSize: paginated.pageSize,
      pageCount: paginated.pageCount,
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

export async function searchEDocReceivedDocuments(filters: EDocSentFilters): Promise<EDocSearchResult> {
  try {
    await ensureAdminOrOperatorEdocAccess();

    const result = await fetchEDocDocumentsFromZen(filters, ['']);
    if (!result.success) {
      return {
        success: false,
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        pageCount: 0,
        error: result.error,
      };
    }

    const receivedItems = filterReceivedOrigin(result.items);
    const availableTypes = buildReceivedTypeTree(receivedItems);
    const filtered = applyClientSideFilters(receivedItems, filters);
    // #region debug-point E:received-after-filter
    reportEdocDebug('E', 'edoc.ts:searchEDocReceivedDocuments:after-filter', 'resultado de recebidos apos origem e filtro local', {
      rawCount: result.items.length,
      afterOriginCount: receivedItems.length,
      filteredCount: filtered.length,
      filters,
    });
    // #endregion
    const paginated = paginateDocuments(filtered, filters.page, filters.pageSize);

    return {
      success: true,
      items: paginated.items,
      total: filtered.length,
      page: paginated.page,
      pageSize: paginated.pageSize,
      pageCount: paginated.pageCount,
      availableTypes,
    };
  } catch (error) {
    return {
      success: false,
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Falha ao consultar documentos recebidos do e-Doc.',
    };
  }
}

export async function getEDocDocumentDetail(
  documentId: string,
  mode: 'sent' | 'received'
): Promise<{ success: boolean; detail?: EDocDocumentDetail; error?: string }> {
  try {
    const session = await ensureAdminOrOperatorEdocAccess();
    if (!documentId) {
      return { success: false, error: 'Documento invalido.' };
    }

    const document = await findEDocDocumentById(documentId, mode);
    if (!document) {
      return { success: false, error: 'Documento nao encontrado no Questor Zen.' };
    }

    const portalResult = await fetchQuestorZenPortalDocumentDetailHtml(session.user_id, documentId);
    const detail = portalResult.html
      ? parsePortalDocumentDetail(portalResult.html, document, portalResult.finalUrl)
      : buildFallbackDetailFromListItem(document);

    return {
      success: true,
      detail,
      ...(portalResult.error && !portalResult.html ? { error: portalResult.error } : {}),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Falha ao consultar detalhe do documento no e-Doc.',
    };
  }
}

function toBrDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function toCompetenceValue(value: string) {
  if (!value) return '';
  const [year, month] = value.split('-');
  if (!year || !month) return value;
  return `${month}/${year}`;
}

function buildAdditionalAttributesFromForm(fields: EDocCreateField[], formData: FormData) {
  const attributes: Record<string, string> = {};

  for (const field of fields) {
    const rawValue = normalizeText(formData.get(field.key));
    if (!rawValue) continue;

    if (field.key === 'DataCompetencia') {
      attributes[field.key] = toCompetenceValue(rawValue);
      continue;
    }

    if (field.key === 'DataVencimento' || field.key === 'DataPublicacao') {
      attributes[field.key] = toBrDate(rawValue);
      continue;
    }

    if (field.key === 'Valor') {
      attributes[field.key] = rawValue.replace(/\./g, '').replace(',', '.');
      continue;
    }

    attributes[field.key] = rawValue;
  }

  return attributes;
}

export async function createEDocDocument(formData: FormData) {
  try {
    await ensureAdminOrOperatorEdocAccess();

    const categoryId = normalizeText(formData.get('categoryId'));
    const companyCnpj = digitsOnly(formData.get('companyCnpj'));
    const title = normalizeText(formData.get('title'));
    const observation = normalizeText(formData.get('observation'));
    const file = formData.get('file');

    if (!categoryId) {
      return { success: false, error: 'Selecione o tipo de documento.' };
    }

    if (!companyCnpj) {
      return { success: false, error: 'Selecione o cliente.' };
    }

    if (!title) {
      return { success: false, error: 'Informe o assunto do documento.' };
    }

    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: 'Selecione um arquivo para envio.' };
    }

    const catalog = await getEDocCreateCatalog();
    const selectedCategory =
      catalog.flatMap((module) => module.categories).find((category) => category.id === categoryId) || null;

    if (!selectedCategory) {
      return { success: false, error: 'Categoria do documento nao encontrada na API do Questor Zen.' };
    }

    for (const field of selectedCategory.fields) {
      if (!field.required) continue;
      const value = normalizeText(formData.get(field.key));
      if (!value) {
        return { success: false, error: `Preencha o campo obrigatorio: ${field.label}.` };
      }
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const uploadedFileId = await uploadToZen(file.name, fileBuffer);
    if (!uploadedFileId) {
      return { success: false, error: 'Falha ao enviar o arquivo para o Questor Zen.' };
    }

    const zenClientCode = await getZenClientByCnpj(companyCnpj);
    if (!zenClientCode) {
      return { success: false, error: `Cliente nao encontrado no Questor Zen para o CNPJ ${companyCnpj}.` };
    }

    const attributes = buildAdditionalAttributesFromForm(selectedCategory.fields, formData);

    const result = await sendDocumentToZen({
      CodigoCategoria: selectedCategory.id,
      CodigoCliente: zenClientCode,
      CodigoArquivo: uploadedFileId,
      Titulo: title,
      Observacao: observation,
      DataCompetencia: attributes.DataCompetencia || '',
      AtributosAdicionais: attributes,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Questor Zen recusou o cadastro do documento.',
      };
    }

    revalidatePath('/admin/edoc/enviados');
    revalidatePath('/admin/edoc/cadastrar');

    return {
      success: true,
      protocol: result.protocol,
      message: 'Documento cadastrado com sucesso no Questor Zen.',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Falha ao cadastrar documento no e-Doc.',
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
    revalidatePath('/admin/edoc/recebidos');

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
