export interface IRDecBlockDefinition {
  id: string;
  title: string;
  description: string;
  codes: string[];
}

export type IRComparisonSourceFormat = 'dec' | 'xml';

export interface IRDecBlockData {
  id: string;
  title: string;
  description: string;
  codes: string[];
  records: string[];
  comparisonText: string;
  recordCount: number;
}

export interface IRDecFileData {
  fileName: string;
  exercise: number;
  calendarYear: number;
  cpf: string;
  name: string;
  uf: string;
  municipalityCode: string;
  municipalityName: string;
  cep: string;
  firstLineLength: number;
  newline: string;
  lines: string[];
  blocks: Record<string, IRDecBlockData>;
  availableBlockIds: string[];
  sourceFormat: IRComparisonSourceFormat;
  generationSupported: boolean;
}

export interface IRDecHeaderEdits {
  exercise: string;
  calendarYear: string;
  cpf: string;
  name: string;
  uf: string;
  municipalityCode: string;
  municipalityName: string;
  cep: string;
}

export const IR_DEC_BLOCK_DEFINITIONS: IRDecBlockDefinition[] = [
  {
    id: 'identificacao',
    title: 'Identificacao do Contribuinte',
    description: 'Cabecalho da declaracao, informacoes mobile e identificacao do declarante.',
    codes: ['IR', '01', '16'],
  },
  {
    id: 'resumo',
    title: 'Resumo e Calculo',
    description: 'Totais e registros de resumo da declaracao simplificada ou completa.',
    codes: ['17', '18', '19', '20'],
  },
  {
    id: 'rendimentos-pj',
    title: 'Rendimentos de Pessoa Juridica',
    description: 'Rendimentos tributaveis de fontes pagadoras e dependentes.',
    codes: ['21', '32', '80', '81'],
  },
  {
    id: 'carne-leao',
    title: 'Carne-Leao e Exterior',
    description: 'Rendimentos recebidos de pessoa fisica, exterior e lancamentos do carne-leao.',
    codes: ['22', '49'],
  },
  {
    id: 'isentos',
    title: 'Isentos e Nao Tributaveis',
    description: 'Rendimentos isentos e informacoes complementares correlatas.',
    codes: ['23', '24', '83', '84', '85', '86', '87'],
  },
  {
    id: 'exclusivos',
    title: 'Tributacao Exclusiva',
    description: 'Rendimentos sujeitos a tributacao exclusiva ou definitiva.',
    codes: ['25', '26', '88', '89'],
  },
  {
    id: 'pagamentos',
    title: 'Pagamentos e Doacoes',
    description: 'Pagamentos efetuados, doacoes e informacoes relacionadas.',
    codes: ['27', '90', '91', '92'],
  },
  {
    id: 'bens-dividas',
    title: 'Bens, Direitos e Dividas',
    description: 'Declaracao patrimonial, bens, direitos, dividas e onus reais.',
    codes: ['28', '29'],
  },
  {
    id: 'inventario-saida',
    title: 'Espolio e Saida Definitiva',
    description: 'Informacoes de inventariante, espolio, herdeiros e saida definitiva.',
    codes: ['30', '38', '39', '58', '59'],
  },
  {
    id: 'dependentes-alimentandos',
    title: 'Dependentes e Alimentandos',
    description: 'Bloco com registros auxiliares de dependentes, doacoes e alimentandos.',
    codes: ['31', '33', '34', '35'],
  },
  {
    id: 'renda-variavel',
    title: 'Renda Variavel',
    description: 'Operacoes em renda variavel e fundos imobiliarios.',
    codes: ['40', '41', '42', '43'],
  },
  {
    id: 'rra',
    title: 'Rendimentos Recebidos Acumuladamente',
    description: 'RRA do titular, dependentes e pensoes vinculadas.',
    codes: ['44', '45', '46', '47', '48'],
  },
  {
    id: 'atividade-rural',
    title: 'Atividade Rural',
    description: 'Receitas, despesas, bens, dividas e informacoes da atividade rural.',
    codes: ['50', '51', '52', '53', '54', '55', '56', '57'],
  },
  {
    id: 'ganho-capital',
    title: 'Ganho de Capital',
    description: 'Registros de GCAP, parcelas, apuracoes e especies.',
    codes: ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75'],
  },
  {
    id: 'outros',
    title: 'Outros Registros',
    description: 'Registros que nao se encaixaram nos blocos principais mapeados.',
    codes: [],
  },
];

const XML_BLOCK_SECTIONS: Record<string, string[]> = {
  identificacao: ['contribuinte', 'copiaIdentificador'],
  resumo: ['resumo', 'comparativo', 'impostoPago'],
  'rendimentos-pj': ['rendPJ', 'rendPJComExigibilidade'],
  'carne-leao': ['rendPFTitular', 'rendPFDependente'],
  isentos: ['rendIsentos'],
  exclusivos: ['rendTributacaoExclusiva', 'rendimentosAplicacoesFinanceiras'],
  pagamentos: [
    'pagamentos',
    'doacoes',
    'doacoesEleitorais',
    'colecaoEstatutoCriancaAdolescente',
    'colecaoEstatutoIdoso',
  ],
  'bens-dividas': ['bens', 'dividas', 'fundosInvestimentos', 'fundosInvestimentosDependente'],
  'inventario-saida': ['herdeiros', 'espolio', 'saida'],
  'dependentes-alimentandos': ['dependentes', 'alimentandos'],
  'renda-variavel': ['rendaVariavel', 'rendaVariavelDependente'],
  rra: ['rendAcm'],
  'atividade-rural': ['atividadeRural'],
  'ganho-capital': ['gcap'],
};

const BLOCK_BY_CODE = new Map<string, IRDecBlockDefinition>();
const XML_SECTION_TO_BLOCK = new Map<string, string>();

for (const definition of IR_DEC_BLOCK_DEFINITIONS) {
  for (const code of definition.codes) {
    BLOCK_BY_CODE.set(code, definition);
  }
}

for (const [blockId, sectionNames] of Object.entries(XML_BLOCK_SECTIONS)) {
  for (const sectionName of sectionNames) {
    XML_SECTION_TO_BLOCK.set(sectionName, blockId);
  }
}

const GENERATION_BLOCK_ORDER = IR_DEC_BLOCK_DEFINITIONS.map((definition) => definition.id);

function normalizeText(content: string) {
  return content.replace(/^\uFEFF/, '');
}

function splitLines(content: string) {
  const normalized = normalizeText(content);
  const newline = normalized.includes('\r\n') ? '\r\n' : '\n';
  const rawLines = normalized.split(/\r?\n/);
  const lines = rawLines.filter((line) => line.length > 0);
  return { lines, newline };
}

function recordCodeFromLine(line: string, index: number) {
  if (index === 0 && line.startsWith('IRPF')) return 'IR';
  return line.slice(0, 2).trim().toUpperCase();
}

function cleanDigits(value: string) {
  return value.replace(/\D/g, '');
}

function padLine(line: string, minLength: number) {
  if (line.length >= minLength) return line;
  return line.padEnd(minLength, ' ');
}

function replaceFixedValue(
  line: string,
  start: number,
  end: number,
  value: string,
  align: 'left' | 'right' = 'left',
  fill = ' '
) {
  const length = end - start + 1;
  const sanitized = (value ?? '').slice(0, length);
  const padded =
    align === 'right' ? sanitized.padStart(length, fill) : sanitized.padEnd(length, fill);
  const ensuredLine = padLine(line, end);
  return `${ensuredLine.slice(0, start - 1)}${padded}${ensuredLine.slice(end)}`;
}

function createEmptyBlocks() {
  const blocks: Record<string, IRDecBlockData> = {};

  for (const definition of IR_DEC_BLOCK_DEFINITIONS) {
    blocks[definition.id] = {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      codes: definition.codes,
      records: [],
      comparisonText: '',
      recordCount: 0,
    };
  }

  return blocks;
}

function normalizeSummaryValue(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function stripNamespace(tagName: string) {
  return tagName.includes(':') ? tagName.split(':').pop() || tagName : tagName;
}

function getElementChildren(element: Element) {
  return Array.from(element.children).filter((child): child is Element => child instanceof Element);
}

function getAttributeEntries(element: Element) {
  return Array.from(element.attributes)
    .filter((attribute) => attribute.name !== 'xmlns' && !attribute.name.startsWith('xmlns:'))
    .map((attribute) => ({
      name: attribute.name,
      value: normalizeSummaryValue(attribute.value),
    }))
    .filter((attribute) => attribute.value !== '' && attribute.value !== '0,00' ? true : attribute.name === 'prepreenchida')
    .filter((attribute) => attribute.value !== '' && attribute.value !== '0');
}

function formatXmlElementForComparison(
  element: Element,
  depth = 0,
  ordinal?: number
): string {
  const indent = '  '.repeat(depth);
  const elementName = stripNamespace(element.localName || element.tagName);
  const title = ordinal ? `${elementName} #${ordinal}` : elementName;
  const lines = [`${indent}${title}`];
  const attributes = getAttributeEntries(element);

  for (const attribute of attributes) {
    lines.push(`${indent}  ${attribute.name}: ${attribute.value}`);
  }

  const children = getElementChildren(element);
  if (children.length === 0) {
    const textContent = normalizeSummaryValue(element.textContent || '');
    if (textContent) {
      lines.push(`${indent}  valor: ${textContent}`);
    }
    return lines.join('\n');
  }

  const allItems = children.every((child) => stripNamespace(child.localName || child.tagName) === 'item');
  children.forEach((child, index) => {
    lines.push(formatXmlElementForComparison(child, depth + 1, allItems ? index + 1 : undefined));
  });

  return lines.join('\n');
}

function getXmlRootElement(content: string) {
  const parser = new DOMParser();
  const document = parser.parseFromString(content, 'application/xml');
  const parserError = document.querySelector('parsererror');
  if (parserError) {
    throw new Error('O arquivo XML informado esta invalido ou nao pode ser interpretado.');
  }

  const root = document.documentElement;
  if (!root || stripNamespace(root.localName || root.tagName) !== 'classe') {
    throw new Error('O arquivo XML informado esta fora do padrao esperado da Receita Federal.');
  }

  return root;
}

function getFirstChildByLocalName(parent: Element, localName: string) {
  return getElementChildren(parent).find(
    (child) => stripNamespace(child.localName || child.tagName) === localName
  );
}

function appendAvailableBlock(availableBlockIds: string[], blockId: string) {
  if (!availableBlockIds.includes(blockId)) {
    availableBlockIds.push(blockId);
  }
}

function getEditableBlockText(file: IRDecFileData, blockId: string) {
  if (file.sourceFormat !== 'dec') return '';
  return (file.blocks[blockId]?.records ?? []).join(file.newline);
}

function parseXmlSaveYear(rawDate: string) {
  const digits = cleanDigits(rawDate);
  if (digits.length < 8) return 0;
  return Number(digits.slice(4, 8)) || 0;
}

function extractCpfFromFileName(fileName: string) {
  const match = fileName.match(/(\d{11})/);
  return match ? match[1] : '';
}

function countXmlOccurrences(section: Element) {
  const children = getElementChildren(section);
  if (children.length === 0) return 1;
  return children.length;
}

export function parseIRDecContent(fileName: string, content: string): IRDecFileData {
  const { lines, newline } = splitLines(content);

  if (lines.length < 2) {
    throw new Error(`O arquivo ${fileName} nao possui registros suficientes para um .DEC valido.`);
  }

  const headerLine = lines[0];
  if (!headerLine.startsWith('IRPF')) {
    throw new Error(`O arquivo ${fileName} esta fora do padrao .DEC da Receita Federal.`);
  }

  const hasTrailer = lines.some((line, index) => recordCodeFromLine(line, index) === 'T9');
  if (!hasTrailer) {
    throw new Error(`O arquivo ${fileName} esta fora do padrao .DEC: nao foi encontrado o registro T9.`);
  }

  const exercise = Number(headerLine.slice(8, 12).trim() || 0);
  const calendarYear = Number(headerLine.slice(12, 16).trim() || 0);
  const cpf = cleanDigits(headerLine.slice(21, 32));
  const name = headerLine.slice(39, 99).trim();
  const uf = headerLine.slice(99, 101).trim();
  const municipalityCode = headerLine.slice(174, 178).trim();
  const cep = cleanDigits(headerLine.slice(218, 226));
  const municipalityName = headerLine.length >= 629 ? headerLine.slice(589, 629).trim() : '';

  const blocks = createEmptyBlocks();
  const availableBlockIds: string[] = [];

  for (const [index, line] of lines.entries()) {
    const code = recordCodeFromLine(line, index);
    if (
      code === 'T9' ||
      code === 'HR' ||
      code === 'DR' ||
      code === 'R9' ||
      code === 'HC' ||
      code === 'RC' ||
      code === 'NC' ||
      code === 'VC' ||
      code === 'MC' ||
      code === 'TC'
    ) {
      continue;
    }

    const blockDefinition =
      BLOCK_BY_CODE.get(code) ?? IR_DEC_BLOCK_DEFINITIONS.find((item) => item.id === 'outros');
    if (!blockDefinition) continue;

    const targetBlock = blocks[blockDefinition.id];
    targetBlock.records.push(line);
    targetBlock.recordCount = targetBlock.records.length;
    targetBlock.comparisonText = targetBlock.records.join(newline);
    appendAvailableBlock(availableBlockIds, blockDefinition.id);
  }

  return {
    fileName,
    exercise,
    calendarYear,
    cpf,
    name,
    uf,
    municipalityCode,
    municipalityName,
    cep,
    firstLineLength: headerLine.length,
    newline,
    lines,
    blocks,
    availableBlockIds,
    sourceFormat: 'dec',
    generationSupported: true,
  };
}

export function parseIRXmlContent(fileName: string, content: string): IRDecFileData {
  const root = getXmlRootElement(content);
  const newline = '\n';
  const contribuinte = getFirstChildByLocalName(root, 'contribuinte');
  const copiaIdentificador = getFirstChildByLocalName(root, 'copiaIdentificador');
  const copyAttrs = copiaIdentificador ? Object.fromEntries(getAttributeEntries(copiaIdentificador).map((entry) => [entry.name, entry.value])) : {};

  const exercise = Number(cleanDigits(copyAttrs.exercicio || '')) || parseXmlSaveYear(root.getAttribute('dataHoraSalvamento') || '');
  const calendarYear = exercise > 0 ? exercise - 1 : 0;
  const cpf = cleanDigits(copyAttrs.cpf || extractCpfFromFileName(fileName));
  const name = normalizeSummaryValue(copyAttrs.nome || '');
  const uf = normalizeSummaryValue(contribuinte?.getAttribute('uf') || '').toUpperCase();
  const municipalityCode = cleanDigits(contribuinte?.getAttribute('municipio') || '').slice(0, 4);
  const municipalityName = normalizeSummaryValue(contribuinte?.getAttribute('cidade') || '');
  const cep = cleanDigits(contribuinte?.getAttribute('cep') || '');

  const blocks = createEmptyBlocks();
  const availableBlockIds: string[] = [];

  for (const section of getElementChildren(root)) {
    const sectionName = stripNamespace(section.localName || section.tagName);
    const blockId = XML_SECTION_TO_BLOCK.get(sectionName) || 'outros';
    const block = blocks[blockId];
    const comparisonText = formatXmlElementForComparison(section);

    if (!comparisonText.trim()) continue;

    block.comparisonText = block.comparisonText
      ? `${block.comparisonText}${newline}${newline}${comparisonText}`
      : comparisonText;
    block.recordCount += countXmlOccurrences(section);
    appendAvailableBlock(availableBlockIds, blockId);
  }

  return {
    fileName,
    exercise,
    calendarYear,
    cpf,
    name,
    uf,
    municipalityCode,
    municipalityName,
    cep,
    firstLineLength: 0,
    newline,
    lines: [],
    blocks,
    availableBlockIds,
    sourceFormat: 'xml',
    generationSupported: false,
  };
}

export function getLatestIRComparableFile(files: IRDecFileData[]) {
  return [...files].sort((left, right) => {
    if (right.exercise !== left.exercise) return right.exercise - left.exercise;
    if (right.calendarYear !== left.calendarYear) return right.calendarYear - left.calendarYear;
    if (right.generationSupported !== left.generationSupported) {
      return Number(right.generationSupported) - Number(left.generationSupported);
    }
    return right.lines.length - left.lines.length;
  })[0];
}

export function getPreferredGenerationBaseFile(files: IRDecFileData[]) {
  const decFiles = files.filter((file) => file.generationSupported);
  if (decFiles.length === 0) return null;
  return getLatestIRComparableFile(decFiles);
}

export function getBlockText(file: IRDecFileData, blockId: string) {
  return file.blocks[blockId]?.comparisonText ?? '';
}

export function getBlockEditableText(file: IRDecFileData, blockId: string) {
  return getEditableBlockText(file, blockId);
}

export function buildDefaultSourceMap(
  primaryFile: IRDecFileData,
  secondaryFile: IRDecFileData,
  primaryLabel: 'arquivoA' | 'arquivoB',
  secondaryLabel: 'arquivoA' | 'arquivoB'
) {
  const sources: Record<string, 'arquivoA' | 'arquivoB'> = {};

  for (const blockId of GENERATION_BLOCK_ORDER) {
    const primaryHasContent = (primaryFile.blocks[blockId]?.recordCount ?? 0) > 0;
    const secondaryHasContent = (secondaryFile.blocks[blockId]?.recordCount ?? 0) > 0;

    if (primaryHasContent) {
      sources[blockId] = primaryLabel;
      continue;
    }

    if (secondaryHasContent) {
      sources[blockId] = secondaryLabel;
    }
  }

  return sources;
}

export function buildInitialDrafts(
  sourceMap: Record<string, 'arquivoA' | 'arquivoB'>,
  fileA: IRDecFileData,
  fileB: IRDecFileData
) {
  const drafts: Record<string, string> = {};

  for (const blockId of GENERATION_BLOCK_ORDER) {
    const source = sourceMap[blockId];
    const selectedFile = source === 'arquivoB' ? fileB : fileA;
    const fallbackFile = selectedFile === fileA ? fileB : fileA;
    drafts[blockId] =
      getEditableBlockText(selectedFile, blockId) || getEditableBlockText(fallbackFile, blockId);
  }

  return drafts;
}

export function buildHeaderEditsFromFile(file: IRDecFileData): IRDecHeaderEdits {
  return {
    exercise: String(file.exercise || ''),
    calendarYear: String(file.calendarYear || ''),
    cpf: file.cpf || '',
    name: file.name || '',
    uf: file.uf || '',
    municipalityCode: file.municipalityCode || '',
    municipalityName: file.municipalityName || '',
    cep: file.cep || '',
  };
}

export function mergeHeaderEdits(
  primary: IRDecHeaderEdits,
  fallback: IRDecHeaderEdits
): IRDecHeaderEdits {
  return {
    exercise: primary.exercise || fallback.exercise,
    calendarYear: primary.calendarYear || fallback.calendarYear,
    cpf: primary.cpf || fallback.cpf,
    name: primary.name || fallback.name,
    uf: primary.uf || fallback.uf,
    municipalityCode: primary.municipalityCode || fallback.municipalityCode,
    municipalityName: primary.municipalityName || fallback.municipalityName,
    cep: primary.cep || fallback.cep,
  };
}

function extractHeaderLine(blockDrafts: Record<string, string>, baseFile: IRDecFileData) {
  const identificacao = blockDrafts.identificacao || getEditableBlockText(baseFile, 'identificacao');
  const identLines = splitLines(identificacao).lines;
  if (identLines.length > 0 && identLines[0].startsWith('IRPF')) {
    return identLines[0];
  }
  return baseFile.lines[0];
}

function applyHeaderEdits(line: string, edits: IRDecHeaderEdits) {
  let updated = line;

  updated = replaceFixedValue(updated, 9, 12, cleanDigits(edits.exercise).slice(0, 4), 'right', '0');
  updated = replaceFixedValue(updated, 13, 16, cleanDigits(edits.calendarYear).slice(0, 4), 'right', '0');
  updated = replaceFixedValue(updated, 21, 21, '0');
  updated = replaceFixedValue(updated, 22, 32, cleanDigits(edits.cpf).slice(0, 11), 'right', '0');
  updated = replaceFixedValue(updated, 40, 99, (edits.name || '').toUpperCase());
  updated = replaceFixedValue(updated, 100, 101, (edits.uf || '').toUpperCase().slice(0, 2));
  updated = replaceFixedValue(updated, 102, 111, '0000000000', 'right', '0');
  updated = replaceFixedValue(updated, 123, 123, 'N');
  updated = replaceFixedValue(updated, 165, 174, '', 'left', ' ');
  updated = replaceFixedValue(updated, 175, 178, cleanDigits(edits.municipalityCode).slice(0, 4), 'right', '0');
  updated = replaceFixedValue(updated, 219, 226, cleanDigits(edits.cep).slice(0, 8), 'right', '0');

  if (updated.length >= 629) {
    updated = replaceFixedValue(updated, 590, 629, (edits.municipalityName || '').toUpperCase());
  }

  if (updated.length >= 660) {
    updated = replaceFixedValue(updated, 650, 660, (edits.name || '').toUpperCase());
  }

  return updated;
}

function buildTrailer(baseFile: IRDecFileData) {
  const trailerLine = baseFile.lines.find((line, index) => recordCodeFromLine(line, index) === 'T9');
  if (trailerLine) return trailerLine;
  return 'T9';
}

export function generateMergedIRDec(
  baseFile: IRDecFileData,
  blockDrafts: Record<string, string>,
  headerEdits: IRDecHeaderEdits
) {
  const mergedLines: string[] = [];
  let headerInjected = false;

  for (const blockId of GENERATION_BLOCK_ORDER) {
    if (blockId === 'outros') continue;

    const content = (blockDrafts[blockId] || '').trim();
    if (!content) continue;

    const lines = splitLines(content).lines;
    if (lines.length === 0) continue;

    if (blockId === 'identificacao') {
      const headerLine = extractHeaderLine(blockDrafts, baseFile);
      mergedLines.push(applyHeaderEdits(headerLine, headerEdits));
      for (const line of lines.slice(1)) {
        mergedLines.push(line);
      }
      headerInjected = true;
      continue;
    }

    mergedLines.push(...lines);
  }

  if (!headerInjected) {
    mergedLines.unshift(applyHeaderEdits(baseFile.lines[0], headerEdits));
  }

  const outrosContent = (blockDrafts.outros || '').trim();
  if (outrosContent) {
    mergedLines.push(...splitLines(outrosContent).lines);
  }

  mergedLines.push(buildTrailer(baseFile));

  return `${mergedLines.join(baseFile.newline)}${baseFile.newline}`;
}
