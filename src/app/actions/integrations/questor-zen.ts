'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { load } from 'cheerio';

export type QuestorZenConfig = {
  id: number;
  base_url: string;
  api_token: string;
  updated_at: Date;
};

export type QuestorZenCredenciaisUsuario = {
  questor_zen_usuario: string | null;
  questor_zen_senha: string | null;
  questor_zen_token: string | null;
};

export type QuestorZenRegFormRecord = Record<string, string>;
export type QuestorZenSelectedEvent = {
  code: string;
  label: string;
};
export type QuestorZenVariableEvent = {
  codigo: string;
  descricao: string;
  referencia: 'Hora' | 'Valor' | 'Dia';
  tipo: 'Provento' | 'Desconto';
};

export type QuestorZenSaveRegFormPayload = {
  userId: string;
  clientOwnerDocument: string;
  companyCode: string;
  categoryId: string;
  formName: string;
  formTitle: string;
  documentSubject: string;
  documentObservation?: string;
  selectedEvents: string[];
  selectedEventItems: QuestorZenSelectedEvent[];
  records: QuestorZenRegFormRecord[];
  gridHeaders: string[];
  gridRows: string[][];
};

type QuestorZenCookieJar = Map<string, string>;
type JsonObject = Record<string, unknown>;
type QuestorZenCategory = {
  Codigo?: unknown;
  Descricao?: unknown;
};
type QuestorZenModule = {
  Codigo?: unknown;
  Descricao?: unknown;
  Categorias?: QuestorZenCategory[];
};

const DEFAULT_EVENT_REFERENCE_TYPES = JSON.stringify([
  { reference: 'Hora', mask: '000:00', initials: 'Hs', masktype: 'Horas', referenceid: 1 },
  { reference: 'Valor', mask: '000.000.000.000,00', initials: 'VLR', masktype: 'Valor', referenceid: 2 },
  { reference: 'Percentual', mask: '000.000.000.000,00', initials: '%', masktype: 'Valor', referenceid: 3 },
  { reference: 'Dia', mask: '000.000.000.000', initials: 'Dias', masktype: 'Unidades', referenceid: 4 },
  { reference: 'Unidade', mask: '000.000.000.000', initials: 'Und', masktype: 'Unidades', referenceid: 5 },
  { reference: 'Média', mask: '000.000.000.000,00', initials: 'Media', masktype: 'Valor', referenceid: 6 },
  { reference: 'Imposto', mask: '000.000.000.000,00', initials: 'Impost', masktype: 'Valor', referenceid: 7 },
]);

const questorZenConfigSchema = z.object({
  base_url: z.string().url('O domínio do cliente deve ser uma URL válida').min(1, 'O domínio do cliente é obrigatório'),
  api_token: z.string().min(1, 'O token de acesso é obrigatório'),
});

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

// #region debug-point A:reporter
function reportZenAuthDebug(hypothesisId: string, location: string, msg: string, data: Record<string, unknown>) {
  try {
    const fs = require('fs') as typeof import('fs');
    const envPath = '.dbg/edoc-portal-auth.env';
    let serverUrl = 'http://127.0.0.1:7777/event';
    let sessionId = 'edoc-portal-auth';
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

function tryParseJsonObject(text: string): JsonObject | null {
  try {
    const parsed: unknown = text ? JSON.parse(text) : null;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as JsonObject)
      : null;
  } catch {
    return null;
  }
}

function extractPortalLoginForm(html: string, fallbackAction: string) {
  const $ = load(html);
  const form =
    $('form').filter((_, element) => {
      const action = String($(element).attr('action') || '');
      return action.includes('/entrar') || $(element).find('input[name="UserName"]').length > 0;
    }).first();

  if (!form.length) {
    return {
      action: fallbackAction,
      hiddenFields: {} as Record<string, string>,
    };
  }

  const action = String(form.attr('action') || '').trim() || fallbackAction;
  const hiddenFields: Record<string, string> = {};

  form.find('input[type="hidden"], input:not([type])').each((_, element) => {
    const name = String($(element).attr('name') || '').trim();
    if (!name || name === 'UserName' || name === 'Password') return;
    hiddenFields[name] = String($(element).attr('value') || '');
  });

  return {
    action,
    hiddenFields,
  };
}

export async function getQuestorZenConfig(): Promise<QuestorZenConfig | null> {
  const result = await db.query('SELECT * FROM questor_zen_config WHERE id = 1');
  return result.rows[0] || null;
}

export async function getQuestorZenCredenciaisUsuario(userId: string): Promise<QuestorZenCredenciaisUsuario | null> {
  const result = await db.query(
    `SELECT questor_zen_usuario, questor_zen_senha, questor_zen_token
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0] || null;
}

export async function saveQuestorZenConfig(data: z.infer<typeof questorZenConfigSchema>) {
  try {
    const validatedData = questorZenConfigSchema.parse(data);

    // Format URL to ensure it doesn't end with a slash for easier usage later
    let domain = validatedData.base_url.trim();
    if (domain.endsWith('/')) {
      domain = domain.slice(0, -1);
    }

    const existing = await getQuestorZenConfig();
    
    if (existing) {
      await db.query(
        `UPDATE questor_zen_config SET base_url = $1, api_token = $2, updated_at = NOW() WHERE id = 1`, 
        [domain, validatedData.api_token.trim()]
      );
    } else {
      await db.query(
        `INSERT INTO questor_zen_config (id, base_url, api_token) VALUES (1, $1, $2)`, 
        [domain, validatedData.api_token.trim()]
      );
    }
    
    revalidatePath('/admin/integrations/questor');
    return { success: true };
  } catch (error: unknown) {
    return { error: getErrorMessage(error) || 'Erro ao salvar configuração do Questor Zen' };
  }
}

// --- Funções de Integração com a API do Questor Zen ---

function buildUrl(config: QuestorZenConfig, path: string) {
  const base = config.base_url.replace(/\/$/, '');
  return `${base}/api/v1/${config.api_token}${path}`;
}

function buildPortalUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function normalizeZenText(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  let normalized = raw;

  // Corrige casos comuns de texto UTF-8 lido como latin1/cp1252.
  if (/[ÃÂ�├┬]/.test(normalized)) {
    try {
      normalized = Buffer.from(normalized, 'latin1').toString('utf8');
    } catch {
      normalized = raw;
    }
  }

  const cp437Candidate = decodeCp437Utf8Mojibake(raw);
  if (scoreZenDecodedText(cp437Candidate) > scoreZenDecodedText(normalized)) {
    normalized = cp437Candidate;
  }

  return normalized
    .replace(/&nbsp;?/gi, ' ')
    .replace(/;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreZenDecodedText(value: string): number {
  let score = 0;
  if (/[A-Za-z]/.test(value)) score += 1;
  if (/[ÁÀÃÂÉÊÍÓÔÕÚÜÇáàãâéêíóôõúüç]/.test(value)) score += 3;
  if (value.includes('�')) score -= 4;
  if (/[ÃÂ�├┬]/.test(value)) score -= 3;
  return score;
}

async function readPortalResponseText(response: Response): Promise<string> {
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const utf8Text = buffer.toString('utf8');
  if (contentType.includes('charset=utf-8')) {
    return utf8Text;
  }
  const latin1Text = buffer.toString('latin1');
  return scoreZenDecodedText(latin1Text) > scoreZenDecodedText(utf8Text) ? latin1Text : utf8Text;
}

function decodeCp437Utf8Mojibake(value: string): string {
  if (!/[├┬╞╟╔╚╩╦╠╣╬╨╤╥]/.test(value)) {
    return value;
  }

  try {
    const decoder = new TextDecoder('ibm437');
    const inverseMap = new Map<string, number>();
    for (let index = 0; index <= 255; index += 1) {
      inverseMap.set(decoder.decode(Uint8Array.of(index)), index);
    }

    const bytes: number[] = [];
    for (const char of value) {
      if (char.charCodeAt(0) <= 0x7f) {
        bytes.push(char.charCodeAt(0));
        continue;
      }

      const byte = inverseMap.get(char);
      if (byte === undefined) {
        return value;
      }
      bytes.push(byte);
    }

    return Buffer.from(bytes).toString('utf8');
  } catch {
    return value;
  }
}

function splitSetCookieHeader(value: string): string[] {
  return value.split(/,(?=\s*[^;=]+=[^;]+)/g);
}

function getSetCookieHeaders(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
    raw?: () => Record<string, string[]>;
  };

  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  if (typeof headers.raw === 'function') {
    return headers.raw()['set-cookie'] || [];
  }

  const singleHeader = response.headers.get('set-cookie');
  return singleHeader ? splitSetCookieHeader(singleHeader) : [];
}

function updateCookieJar(cookieJar: QuestorZenCookieJar, response: Response) {
  for (const setCookie of getSetCookieHeaders(response)) {
    const [cookiePair] = setCookie.split(';');
    const separatorIndex = cookiePair.indexOf('=');
    if (separatorIndex <= 0) continue;

    const cookieName = cookiePair.slice(0, separatorIndex).trim();
    const cookieValue = cookiePair.slice(separatorIndex + 1).trim();

    if (cookieName) {
      cookieJar.set(cookieName, cookieValue);
    }
  }
}

function serializeCookieJar(cookieJar: QuestorZenCookieJar): string {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

function buildPortalHeaders(baseUrl: string, refererPath: string, cookieJar: QuestorZenCookieJar, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = {
    'Accept': '*/*',
    'Origin': baseUrl.replace(/\/$/, ''),
    'Referer': buildPortalUrl(baseUrl, refererPath),
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
    ...extraHeaders,
  };

  const cookieHeader = serializeCookieJar(cookieJar);
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }

  return headers;
}

async function portalFetch(
  baseUrl: string,
  path: string,
  cookieJar: QuestorZenCookieJar,
  init: RequestInit,
  refererPath: string
): Promise<Response> {
  const headers = buildPortalHeaders(baseUrl, refererPath, cookieJar, init.headers as Record<string, string> | undefined);

  const response = await fetch(buildPortalUrl(baseUrl, path), {
    ...init,
    headers,
    redirect: init.redirect || 'manual',
  });

  updateCookieJar(cookieJar, response);
  return response;
}

function isRedirectStatus(status: number) {
  return status >= 300 && status < 400;
}

function isLoginHtml(html: string) {
  return html.includes('form-signin') || html.includes('name="UserName"') || html.includes('id="login-button"');
}

async function authenticateQuestorZenPortal(baseUrl: string, credentials: QuestorZenCredenciaisUsuario) {
  const cookieJar: QuestorZenCookieJar = new Map();
  const returnPath = '/cliente/documento/configurarcadastroselecionado';
  const encodedReturnUrl = encodeURIComponent(returnPath);
  const loginPath = `/entrar?returnUrl=${encodedReturnUrl}`;

  // #region debug-point C:auth-entry
  reportZenAuthDebug('C', 'questor-zen.ts:authenticateQuestorZenPortal:entry', 'inicio da autenticacao no portal', {
    baseUrl,
    loginPath,
    hasUser: Boolean(credentials.questor_zen_usuario),
    userLength: credentials.questor_zen_usuario?.length || 0,
    hasPassword: Boolean(credentials.questor_zen_senha),
    passwordLength: credentials.questor_zen_senha?.length || 0,
  });
  // #endregion

  const initialLoginResponse = await portalFetch(baseUrl, loginPath, cookieJar, {
    method: 'GET',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  }, '/cliente/painel');
  const initialLoginHtml = await readPortalResponseText(initialLoginResponse);
  const parsedLoginForm = extractPortalLoginForm(initialLoginHtml, loginPath);
  // #region debug-point B:login-get
  reportZenAuthDebug('B', 'questor-zen.ts:authenticateQuestorZenPortal:login-get', 'resposta inicial do GET de login', {
    status: initialLoginResponse.status,
    location: initialLoginResponse.headers.get('location') || '',
    cookieCount: cookieJar.size,
    formAction: parsedLoginForm.action,
    hiddenFieldNames: Object.keys(parsedLoginForm.hiddenFields),
    htmlLength: initialLoginHtml.length,
  });
  // #endregion

  const loginBody = new URLSearchParams({
    ...parsedLoginForm.hiddenFields,
    UserName: credentials.questor_zen_usuario || '',
    Password: credentials.questor_zen_senha || '',
  }).toString();

  const loginSubmitPath = parsedLoginForm.action.startsWith('http')
    ? parsedLoginForm.action
    : parsedLoginForm.action.startsWith('/')
      ? parsedLoginForm.action
      : `/${parsedLoginForm.action}`;

  const loginResponse = await portalFetch(baseUrl, loginSubmitPath, cookieJar, {
    method: 'POST',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: loginBody,
  }, loginPath);
  // #region debug-point B:login-post
  reportZenAuthDebug('B', 'questor-zen.ts:authenticateQuestorZenPortal:login-post', 'resposta do POST de login', {
    status: loginResponse.status,
    location: loginResponse.headers.get('location') || '',
    cookieCount: cookieJar.size,
    submitPath: loginSubmitPath,
    hiddenFieldCount: Object.keys(parsedLoginForm.hiddenFields).length,
  });
  // #endregion

  if (isRedirectStatus(loginResponse.status)) {
    const redirectLocation = loginResponse.headers.get('location');
    if (redirectLocation) {
      const redirectUrl = redirectLocation.startsWith('http')
        ? redirectLocation
        : buildPortalUrl(baseUrl, redirectLocation);

      const redirectResponse = await fetch(redirectUrl, {
        method: 'GET',
        headers: buildPortalHeaders(baseUrl, loginPath, cookieJar, {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }),
        redirect: 'manual',
      });
      updateCookieJar(cookieJar, redirectResponse);
      // #region debug-point D:redirect-follow
      reportZenAuthDebug('D', 'questor-zen.ts:authenticateQuestorZenPortal:redirect-follow', 'redirecionamento seguido apos login', {
        redirectUrl,
        status: redirectResponse.status,
        location: redirectResponse.headers.get('location') || '',
        cookieCount: cookieJar.size,
      });
      // #endregion
    }
  }

  const validateResponse = await portalFetch(baseUrl, '/cliente/painel', cookieJar, {
    method: 'GET',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  }, loginPath);
  // #region debug-point E:validate-status
  reportZenAuthDebug('E', 'questor-zen.ts:authenticateQuestorZenPortal:validate-status', 'resposta de validacao do painel', {
    status: validateResponse.status,
    location: validateResponse.headers.get('location') || '',
    cookieCount: cookieJar.size,
  });
  // #endregion

  if (isRedirectStatus(validateResponse.status)) {
    throw new Error('Falha ao autenticar no portal do Questor Zen. Verifique usuário e senha salvos.');
  }

  const validateHtml = await validateResponse.text();
  // #region debug-point E:validate-html
  reportZenAuthDebug('E', 'questor-zen.ts:authenticateQuestorZenPortal:validate-html', 'html retornado na validacao do painel', {
    isLoginHtml: isLoginHtml(validateHtml),
    includesPainel: validateHtml.includes('/cliente/painel') || validateHtml.includes('cliente/painel'),
    includesFormSignin: validateHtml.includes('form-signin'),
    includesUserName: validateHtml.includes('name="UserName"'),
    htmlLength: validateHtml.length,
    htmlSnippet: validateHtml.slice(0, 300),
  });
  // #endregion
  if (isLoginHtml(validateHtml)) {
    throw new Error('As credenciais salvas do Questor Zen foram rejeitadas pelo portal.');
  }

  return cookieJar;
}

async function fetchPortalHtmlPage(
  baseUrl: string,
  cookieJar: QuestorZenCookieJar,
  path: string,
  refererPath: string
): Promise<{ html: string; finalUrl: string; status: number }> {
  let response = await portalFetch(baseUrl, path, cookieJar, {
    method: 'GET',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  }, refererPath);

  let finalUrl = buildPortalUrl(baseUrl, path);

  if (isRedirectStatus(response.status)) {
    const redirectLocation = response.headers.get('location');
    if (redirectLocation) {
      finalUrl = redirectLocation.startsWith('http')
        ? redirectLocation
        : buildPortalUrl(baseUrl, redirectLocation);

      response = await fetch(finalUrl, {
        method: 'GET',
        headers: buildPortalHeaders(baseUrl, refererPath, cookieJar, {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }),
        redirect: 'manual',
      });
      updateCookieJar(cookieJar, response);
    }
  }

  return {
    html: await readPortalResponseText(response),
    finalUrl,
    status: response.status,
  };
}

export async function fetchQuestorZenPortalDocumentDetailHtml(
  userId: string,
  documentId: string
): Promise<{ html: string | null; finalUrl?: string; error?: string }> {
  try {
    const config = await getQuestorZenConfig();
    if (!config) {
      return { html: null, error: 'Configuração do Questor Zen não encontrada.' };
    }

    const credentials = await getQuestorZenCredenciaisUsuario(userId);
    // #region debug-point A:credentials-read
    reportZenAuthDebug('A', 'questor-zen.ts:fetchQuestorZenPortalDocumentDetailHtml:credentials-read', 'credenciais lidas para detalhe do documento', {
      userId,
      documentId,
      hasUser: Boolean(credentials?.questor_zen_usuario),
      userLength: credentials?.questor_zen_usuario?.length || 0,
      hasPassword: Boolean(credentials?.questor_zen_senha),
      passwordLength: credentials?.questor_zen_senha?.length || 0,
      hasToken: Boolean(credentials?.questor_zen_token),
    });
    // #endregion
    if (!credentials?.questor_zen_usuario || !credentials?.questor_zen_senha) {
      return {
        html: null,
        error: 'Usuário e senha do Questor Zen não foram configurados no Meu Perfil do usuário logado.'
      };
    }

    const baseUrl = config.base_url.replace(/\/$/, '');
    const cookieJar = await authenticateQuestorZenPortal(baseUrl, credentials);
    const refererPath = '/cliente/documento/enviados';
    const candidates = [
      `/cliente/documento/detalhesdocumento/${encodeURIComponent(documentId)}`,
      `/cliente/documento/detalhesdocumento?documentId=${encodeURIComponent(documentId)}`,
      `/cliente/documento/detalhesdocumento?id=${encodeURIComponent(documentId)}`,
      `/cliente/documento/documentodetalhes/${encodeURIComponent(documentId)}`,
      `/cliente/documento/documentodetalhes?documentId=${encodeURIComponent(documentId)}`,
      `/cliente/documento/documentodetalhes?id=${encodeURIComponent(documentId)}`,
      `/cliente/documento/visualizardetalhes/${encodeURIComponent(documentId)}`,
      `/cliente/documento/visualizardetalhes?documentId=${encodeURIComponent(documentId)}`,
      `/cliente/documento/visualizardetalhes?id=${encodeURIComponent(documentId)}`,
      `/cliente/documento/detalhes/${encodeURIComponent(documentId)}`,
      `/cliente/documento/detalhes?id=${encodeURIComponent(documentId)}`,
      `/cliente/documento/documento/${encodeURIComponent(documentId)}`,
      `/cliente/documento/documento?id=${encodeURIComponent(documentId)}`,
    ];

    for (const candidate of candidates) {
      const page = await fetchPortalHtmlPage(baseUrl, cookieJar, candidate, refererPath);
      if (page.status >= 400 || !page.html || isLoginHtml(page.html)) {
        continue;
      }

      const normalizedHtml = normalizeZenText(page.html);
      const looksLikeDetailPage =
        normalizedHtml.includes('Detalhes do Documento') ||
        normalizedHtml.includes('Movimentações') ||
        normalizedHtml.includes('Movimentacoes') ||
        normalizedHtml.includes('Comentários') ||
        normalizedHtml.includes('Comentarios');

      if (!looksLikeDetailPage) {
        continue;
      }

      return {
        html: page.html,
        finalUrl: page.finalUrl,
      };
    }

    return {
      html: null,
      error: 'Nenhuma rota de detalhe conhecida do portal do Questor Zen respondeu com a página do documento.',
    };
  } catch (error: unknown) {
    return {
      html: null,
      error: getErrorMessage(error) || 'Falha ao buscar detalhe do documento no portal do Questor Zen.',
    };
  }
}

async function postVerificarSessao(baseUrl: string, cookieJar: QuestorZenCookieJar, clientOwnerDocument: string, email: string) {
  const body = new URLSearchParams({
    client: clientOwnerDocument,
    email,
  }).toString();

  const response = await portalFetch(baseUrl, '/verificarsessao', cookieJar, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  }, '/cliente/documento/configurarcadastroselecionado');

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha em verificarsessao (${response.status}): ${errorText}`);
  }
}

async function postPrintRegFormPrepare(baseUrl: string, cookieJar: QuestorZenCookieJar, gridHeaders: string[], gridRows: string[][]) {
  const body = new URLSearchParams();
  body.set('GridSizeConfigItems', String(gridHeaders.length));
  body.set('GridSizeBodyItems', String(gridRows.length));
  body.set('IsMultipleForms', 'False');

  for (const header of gridHeaders) {
    body.append('GridHeaderItems', header);
  }

  for (const row of gridRows) {
    for (const cell of row) {
      body.append('GridBodyItems', cell);
    }
  }

  body.set('SessionForm', '');

  const response = await portalFetch(baseUrl, '/Plugins/DocumentRegistering/PrintRegFormPrepare', cookieJar, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body.toString(),
  }, '/cliente/documento/configurarcadastroselecionado');

  const responseText = await readPortalResponseText(response);
  if (!response.ok) {
    throw new Error(`Falha em PrintRegFormPrepare (${response.status}): ${responseText}`);
  }

  const parsed = tryParseJsonObject(responseText);
  const sessionForm =
    (typeof parsed?.sessionForm === 'string' ? parsed.sessionForm : '') ||
    (typeof parsed?.SessionForm === 'string' ? parsed.SessionForm : '');
  if (!sessionForm) {
    throw new Error(`PrintRegFormPrepare não retornou sessionForm. Resposta: ${responseText}`);
  }

  return sessionForm;
}

export async function sendQuestorZenRegFormByClient(payload: QuestorZenSaveRegFormPayload): Promise<{ success: boolean; documentId?: string; error?: string; rawResponse?: string }> {
  try {
    const config = await getQuestorZenConfig();
    if (!config) throw new Error('Configuração do Questor Zen não encontrada');

    const credentials = await getQuestorZenCredenciaisUsuario(payload.userId);
    if (!credentials?.questor_zen_usuario || !credentials?.questor_zen_senha) {
      throw new Error('Usuário e senha do Questor Zen não estão salvos no cadastro do usuário cliente.');
    }

    if (!payload.records.length) {
      throw new Error('Nenhum registro foi informado para o envio web do Questor Zen.');
    }

    if (!payload.gridHeaders.length || !payload.gridRows.length) {
      throw new Error('A grade auxiliar do formulário do Questor Zen não foi montada corretamente.');
    }

    const baseUrl = config.base_url.replace(/\/$/, '');
    const cookieJar = await authenticateQuestorZenPortal(baseUrl, credentials);
    const categoryContext = await getZenCategoryContextByCategoryId(payload.categoryId);

    await postVerificarSessao(baseUrl, cookieJar, payload.clientOwnerDocument, credentials.questor_zen_usuario);
    if (categoryContext.moduleId) {
      await postGetQuestorData(baseUrl, cookieJar, categoryContext.moduleId, payload.categoryId, payload.companyCode);
    }
    await postGetVariableEvent(baseUrl, cookieJar, payload.companyCode);
    await postEventsSelecteds(baseUrl, cookieJar, {
      companyCode: payload.companyCode,
      formTitle: payload.formTitle,
      formName: payload.formName,
      categoryId: payload.categoryId,
      selectedEventItems: payload.selectedEventItems,
      fieldNames: Object.keys(payload.records[0] || {}),
    });
    await postPrintRegFormPrepare(baseUrl, cookieJar, payload.gridHeaders, payload.gridRows);

    const formBody = new URLSearchParams();
    formBody.set('jsonFormValues', JSON.stringify({
      idCategory: payload.categoryId,
      name_regForm: payload.formName,
      selectedEvents: payload.selectedEvents.join(';') + ';',
      qtde: String(payload.records.length),
      records: payload.records,
    }));
    formBody.set('ClientOwnerDocument', payload.clientOwnerDocument);
    formBody.set('DocumentSubject', payload.documentSubject);
    formBody.set('Observacao', payload.documentObservation || '');

    const response = await portalFetch(baseUrl, '/Plugins/DocumentRegistering/SaveRegFormByClient?DocumentIdToEdit=', cookieJar, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: formBody.toString(),
    }, '/cliente/documento/configurarcadastroselecionado');

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Falha em SaveRegFormByClient (${response.status}): ${responseText}`);
    }

    const parsed = tryParseJsonObject(responseText);

    if (parsed?.success === false) {
      const parsedError =
        (typeof parsed.error === 'string' ? parsed.error : '') ||
        (typeof parsed.message === 'string' ? parsed.message : '');
      throw new Error(parsedError || 'O portal do Questor Zen recusou o SaveRegFormByClient.');
    }

    const documentId = parsed?.documentId || parsed?.DocumentId || parsed?.id || parsed?.Id;

    return {
      success: true,
      documentId: documentId ? String(documentId) : undefined,
      rawResponse: responseText,
    };
  } catch (error: unknown) {
    console.error('[Questor Zen] Erro no fluxo web SaveRegFormByClient:', getErrorMessage(error));
    return {
      success: false,
      error: getErrorMessage(error) || 'Erro ao executar o fluxo web autenticado do Questor Zen.',
    };
  }
}

export async function uploadToZen(filename: string, content: string | Buffer): Promise<string | null> {
  console.log(`[Questor Zen] Starting uploadToZen for ${filename}...`);
  try {
    const config = await getQuestorZenConfig();
    console.log(`[Questor Zen] Config fetched for uploadToZen: ${!!config}`);
    if (!config) throw new Error('Configuração do Questor Zen não encontrada');

    const url = buildUrl(config, `/upload/${encodeURIComponent(filename)}`);
    console.log(`[Questor Zen] Fetching POST ${url.replace(config.api_token, '***')} ...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Accept': 'application/json'
      },
      body: content
    });
    
    console.log(`[Questor Zen] Response status: ${response.status}`);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Falha no upload (Status ${response.status}): ${errText}`);
    }

    const fileId = await response.json();
    return fileId;
  } catch (error: unknown) {
    console.error('[Questor Zen] Erro em uploadToZen:', getErrorMessage(error));
    return null;
  }
}

export async function getZenClientByCnpj(cnpj: string): Promise<string | null> {
  try {
    const config = await getQuestorZenConfig();
    if (!config) throw new Error('Configuração do Questor Zen não encontrada');

    const cleanCnpj = String(cnpj).replace(/\D/g, '');
    const url = buildUrl(config, `/clientes/${cleanCnpj}`);
    
    const response = await fetch(url, { 
      method: 'GET', 
      headers: { 'Content-Type': 'application/json' } 
    });
    
    if (!response.ok) return null;
    
    const data: unknown = await response.json();
    const codigoCliente =
      data && typeof data === 'object' && 'CodigoCliente' in data ? data.CodigoCliente : null;
    return codigoCliente ? String(codigoCliente) : null;
  } catch (error: unknown) {
    console.error('[Questor Zen] Erro em getZenClientByCnpj:', getErrorMessage(error));
    return null;
  }
}

export async function getZenCategories(): Promise<QuestorZenModule[]> {
  try {
    const config = await getQuestorZenConfig();
    if (!config) throw new Error('Configuração do Questor Zen não encontrada');

    const url = buildUrl(config, `/categorias`);

    const response = await fetch(url, { 
      method: 'GET', 
      headers: { 'Content-Type': 'application/json' } 
    });

    if (!response.ok) return [];

    const data: unknown = await response.json();
    return Array.isArray(data) ? (data as QuestorZenModule[]) : [];
  } catch (error: unknown) {
    console.error('[Questor Zen] Erro em getZenCategories:', getErrorMessage(error));
    return [];
  }
}

async function getZenCategoryContextByCategoryId(categoryId: string): Promise<{ moduleId: string | null; categoryId: string | null }> {
  const categories = await getZenCategories();
  for (const mod of categories) {
    for (const cat of mod.Categorias || []) {
      if (String(cat.Codigo || '') === String(categoryId)) {
        return {
          moduleId: mod.Codigo ? String(mod.Codigo) : null,
          categoryId: String(cat.Codigo),
        };
      }
    }
  }

  if (String(categoryId) === '64b6d631273adf21d4750e53') {
    return {
      moduleId: '64b6d631273adf21d4750e4b',
      categoryId: String(categoryId),
    };
  }

  return { moduleId: null, categoryId: null };
}

export async function findZenCategoryByNames(moduleName: string, categoryName: string): Promise<string | null> {
  // Sempre utilizar o Token do Escritório (Global) para buscar Categorias e Clientes,
  // pois o Token do Cliente frequentemente tem restrições nessas rotas
  const categories = await getZenCategories(); // ignorando o ClientToken aqui
  for (const mod of categories) {
    const moduleDescription = typeof mod.Descricao === 'string' ? mod.Descricao.toLowerCase() : '';
    if (moduleDescription === moduleName.toLowerCase() || !moduleName) {
      for (const cat of mod.Categorias || []) {
        const categoryDescription = typeof cat.Descricao === 'string' ? cat.Descricao.toLowerCase() : '';
        if (categoryDescription === categoryName.toLowerCase()) {
          return cat.Codigo ? String(cat.Codigo) : null;
        }
      }
    }
  }
  return null;
}

async function postGetQuestorData(
  baseUrl: string,
  cookieJar: QuestorZenCookieJar,
  moduleId: string,
  categoryId: string,
  companyCode: string
) {
  const body = new URLSearchParams({
    CategoryId: moduleId,
    CategoryIdRegForm: categoryId,
    CodigoEmpresa: companyCode,
    CodigoEstab: companyCode,
  }).toString();

  const response = await portalFetch(baseUrl, `/Plugins/DocumentRegistering/GetQuestorData/${categoryId}`, cookieJar, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  }, '/cliente/documento/configurarcadastroselecionado');

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha em GetQuestorData (${response.status}): ${errorText}`);
  }
}

async function postGetVariableEvent(baseUrl: string, cookieJar: QuestorZenCookieJar, companyCode: string) {
  const body = new URLSearchParams({
    dataset: 'nFpaDCEventoZENWeb',
    clientId: '',
  }).toString();

  const response = await portalFetch(baseUrl, `/Plugins/DocumentRegistering/GetVariableEvent?codigoEmpresa=${encodeURIComponent(companyCode)}`, cookieJar, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  }, '/cliente/documento/configurarcadastroselecionado');

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha em GetVariableEvent (${response.status}): ${errorText}`);
  }
}

export async function getZenVariableEvents(userId: string, companyCode: string, companyCnpj?: string): Promise<QuestorZenVariableEvent[]> {
  const config = await getQuestorZenConfig();
  if (!config) {
    throw new Error('Configuração do Questor Zen não encontrada');
  }

  const credentials = await getQuestorZenCredenciaisUsuario(userId);
  if (!credentials?.questor_zen_usuario || !credentials?.questor_zen_senha) {
    throw new Error('Usuário e senha do Questor Zen não estão salvos no cadastro do usuário cliente.');
  }

  const baseUrl = config.base_url.replace(/\/$/, '');
  const cookieJar = await authenticateQuestorZenPortal(baseUrl, credentials);
  const payrollCategoryId = '64b6d631273adf21d4750e53';

  if (companyCnpj) {
    const clientOwnerDocument = await getZenClientByCnpj(companyCnpj);
    if (clientOwnerDocument) {
      await postVerificarSessao(baseUrl, cookieJar, clientOwnerDocument, credentials.questor_zen_usuario);
    }
  }

  const categoryContext = await getZenCategoryContextByCategoryId(payrollCategoryId);
  if (categoryContext.moduleId) {
    await postGetQuestorData(baseUrl, cookieJar, categoryContext.moduleId, payrollCategoryId, companyCode);
  }

  const body = new URLSearchParams({
    dataset: 'nFpaDCEventoZENWeb',
    clientId: '',
  }).toString();

  const response = await portalFetch(baseUrl, `/Plugins/DocumentRegistering/GetVariableEvent?codigoEmpresa=${encodeURIComponent(companyCode)}`, cookieJar, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  }, '/cliente/documento/configurarcadastroselecionado');

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Falha em GetVariableEvent (${response.status}): ${responseText}`);
  }

  const parsed = tryParseJsonObject(responseText);
  if (!parsed) {
    throw new Error('O retorno do GetVariableEvent do Questor Zen nao veio em JSON valido.');
  }

  const rows = Array.isArray(parsed?.aaData) ? parsed.aaData : [];
  return rows
    .map((row) => {
      const normalizedRow = Array.isArray(row) ? row : [];
      const referenciaBruta = normalizeZenText(row?.[8] || 'Valor');
      const tipoBruto = normalizeZenText(row?.[9] || 'Provento');

      return {
        codigo: String(normalizedRow[2] ?? '').trim(),
        descricao: normalizeZenText(normalizedRow[3] || 'Evento sem descricao'),
        referencia: referenciaBruta.toLowerCase().includes('hora')
          ? 'Hora'
          : referenciaBruta.toLowerCase().includes('dia')
            ? 'Dia'
            : 'Valor',
        tipo: tipoBruto.toLowerCase().includes('desc')
          ? 'Desconto'
          : 'Provento',
      } satisfies QuestorZenVariableEvent;
    })
    .filter((event) => event.codigo);
}

async function postEventsSelecteds(
  baseUrl: string,
  cookieJar: QuestorZenCookieJar,
  params: {
    companyCode: string;
    formTitle: string;
    formName: string;
    categoryId: string;
    selectedEventItems: QuestorZenSelectedEvent[];
    fieldNames: string[];
  }
) {
  for (const item of params.selectedEventItems) {
    const body = new URLSearchParams();
    body.set('CodEstab', params.companyCode);
    body.set('codigoEmpresa', params.companyCode);
    body.set('CodEmpresaQuestor', params.companyCode);
    body.set('CodEstabQuestor', params.companyCode);
    body.set('Title', params.formTitle);
    body.set('Name', params.formName);
    body.set('IdCategory', params.categoryId);
    body.set('DocumentIdToEdit', '');
    body.set('eventReferenceType', DEFAULT_EVENT_REFERENCE_TYPES);
    body.set('horaCent', '0');
    body.set('EventSuggestion', '');

    for (const fieldName of params.fieldNames) {
      body.append('fields[]', fieldName);
    }

    body.set('codEvento', `${item.code} - ${item.label}`);
    body.set('clientId', '');

    const response = await portalFetch(baseUrl, '/Plugins/DocumentRegistering/EventsSelecteds?&dataset=nFpaDCFuncContrato&idSuggestion=', cookieJar, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: body.toString(),
    }, '/cliente/documento/configurarcadastroselecionado');

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha em EventsSelecteds (${response.status}) para evento ${item.code}: ${errorText}`);
    }
  }
}

export async function sendDocumentToZen(payload: {
  CodigoCategoria: string;
  CodigoCliente: string;
  CodigoArquivo: string;
  Titulo: string;
  Observacao?: string;
  DataCompetencia: string; // Formato YYYYMM ou MM/YYYY
  AtributosAdicionais?: Record<string, string>;
  UseClientToken?: boolean; // <- Flag para usar o token do cliente e forçar cair no Q-Net Recebidos
  ClientToken?: string; // <- Token do cliente passado diretamente
}): Promise<{ success: boolean; protocol?: string; error?: string }> {
  try {
    const config = await getQuestorZenConfig();
    if (!config) throw new Error('Configuração do Questor Zen não encontrada');

    const tokenToUse = config.api_token;
    const base = config.base_url.replace(/\/$/, '');

    // Para Lançamentos de Variáveis via API (Q-Net Aba 1),
    // Já tentamos usar o Token do Cliente, mas ele não tem permissão para POST (Erro 412).
    // O Questor exige que usemos o Token do Escritório, apontando para a categoria Oculta do grupo Questor
    if (payload.UseClientToken && payload.ClientToken) {
       console.log('[Questor Zen] Recebido ClientToken, mas vamos utilizar o Token do Escritório devido a restrições de permissão (Erro 412) na rota de documentos.');
       // Não sobrescrevemos o tokenToUse (mantém o token do escritório)
    }
    const url = `${base}/api/v1/${tokenToUse}/documentos`;
    // Ocultar o token no log por segurança
    console.log(`[Questor Zen] Sending POST to: ${url.replace(tokenToUse, '***')}`);
    
    // Para Lançamentos Eventos Variáveis caírem corretamente no Q-Net
    // Precisamos enviar para /documentos com atributos específicos
    const attrs = { ...payload.AtributosAdicionais };
    if (attrs.isFpa) delete attrs.isFpa;
    
    // Se precisamos forçar o Q-Net (Documentos Recebidos), a única forma documentada
    // na API sem usar o token direto do cliente é forçar a Origem.
    // Como a API não tem um endpoint genérico para gerar token de cliente a partir do escritório (deu 404),
    // Passamos a Origem como 'Cliente' ou 'Q-Net' nos atributos para simular a chegada pelo portal.
    if (payload.UseClientToken) {
       attrs.Origem = 'Cliente';
    }
    
    // Para "Lançamentos Eventos Variáveis", se usarmos a Categoria Oculta do Q-Net (Questor),
    // é essencial que o Título seja formatado corretamente e sem os atributos de e-Doc
    // (A interface espera: VISION "LANÇAMENTOS EVENTOS VARIÁVEIS" ou CADASTRO)
    const categoriaModulo = (payload as { CategoriaModulo?: string }).CategoriaModulo;
    if (categoriaModulo === 'Questor' || payload.Titulo?.includes('CADASTRO') || payload.Titulo?.includes('VISION')) {
      attrs.Origem = "Cliente";
      attrs.Assunto = "Lançamentos Eventos Variáveis";
      attrs.Tipo = "Lançamentos Eventos Variáveis";
      
      // Se não tiver data de competência, o Questor Desktop não lista na tela de Integração
      if (!payload.DataCompetencia) {
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        payload.DataCompetencia = `${mm}/${yyyy}`;
      }
    } else {
      // Padrão do e-Doc
      if (!attrs.Tipo && payload.Titulo) {
        attrs.Tipo = payload.Titulo;
      }
      if (!attrs.Assunto && payload.Titulo) {
        attrs.Assunto = payload.Titulo;
      }
    }
    
    const requestBody = {
      CodigoCategoria: payload.CodigoCategoria,
      CodigoCliente: payload.CodigoCliente,
      CodigoArquivo: payload.CodigoArquivo,
      Titulo: payload.Titulo || 'Lançamentos Eventos Variáveis',
      Observacao: payload.Observacao || '',
      DataCompetencia: payload.DataCompetencia,
      Atributo: {
        ...attrs
      }
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`[Questor Zen] POST /documentos Response Status: ${response.status}`);

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Questor Zen] Erro em sendDocumentToZen:', response.status, errText);
      return { success: false, error: `Erro ${response.status}: ${errText}` };
    }

    const docText = await response.text();
    // A API retorna o ID do documento
    return { success: true, protocol: docText.replace(/"/g, '') };
  } catch (error: unknown) {
    console.error('[Questor Zen] Erro em sendDocumentToZen:', getErrorMessage(error));
    return { success: false, error: getErrorMessage(error) };
  }
}
