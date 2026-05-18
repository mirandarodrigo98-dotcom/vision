'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import {
  buildDefaultSourceMap,
  buildHeaderEditsFromFile,
  buildInitialDrafts,
  generateMergedIRDec,
  getBlockEditableText,
  getBlockText,
  getLatestIRComparableFile,
  getPreferredGenerationBaseFile,
  IR_DEC_BLOCK_DEFINITIONS,
  IRDecFileData,
  IRDecHeaderEdits,
  mergeHeaderEdits,
  parseIRDecContent,
  parseIRXmlContent,
} from '@/lib/ir-dec';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { ArrowLeft, Download, FileCog, FileText, GitMerge, Upload } from 'lucide-react';
import { toast } from 'sonner';

type FileSource = 'arquivoA' | 'arquivoB';
type PreviewField = {
  label: string;
  value: string;
};
type PreviewSection = {
  title: string;
  fields: PreviewField[];
};

const ACCEPTED_EXTENSIONS = ['.dec', '.xml'];

const FILE_SOURCE_LABEL: Record<FileSource, string> = {
  arquivoA: 'Arquivo 1',
  arquivoB: 'Arquivo 2',
};

const FIELD_LABELS: Record<string, string> = {
  bairro: 'Bairro',
  celular: 'Celular',
  cep: 'CEP',
  cidade: 'Cidade',
  complemento: 'Complemento',
  conjuge: 'Conjuge',
  cpf: 'CPF',
  cpfConjuge: 'CPF do conjuge',
  cpfProcurador: 'CPF do procurador',
  dataNascimento: 'Data de nascimento',
  dataRetorno: 'Data de retorno',
  dddCelular: 'DDD celular',
  email: 'E-mail',
  enderecoNumero: 'Numero',
  logradouro: 'Logradouro',
  municipio: 'Codigo do municipio',
  naturezaOcupacao: 'Natureza da ocupacao',
  nome: 'Nome',
  nomeMae: 'Nome da mae',
  ocupacaoPrincipal: 'Ocupacao principal',
  pais: 'Pais',
  pergunta: 'Pergunta',
  resposta: 'Resposta',
  sexo: 'Sexo',
  tipoDeclaracao: 'Tipo da declaracao',
  tituloEleitor: 'Titulo de eleitor',
  uf: 'UF',
};

const BLOCK_DECLARATION_HINT: Record<string, string> = {
  identificacao: 'Identificacao do contribuinte e dados principais da declaracao.',
  resumo: 'Resumo do imposto apurado, saldo a pagar ou restituicao.',
  'rendimentos-pj': 'Fontes pagadoras, rendimentos tributaveis e imposto retido.',
  'carne-leao': 'Rendimentos recebidos de pessoa fisica e do exterior.',
  isentos: 'Rendimentos isentos ou nao tributaveis declarados.',
  exclusivos: 'Rendimentos com tributacao exclusiva ou definitiva.',
  pagamentos: 'Pagamentos efetuados, doacoes e despesas dedutiveis.',
  'bens-dividas': 'Bens, direitos, financiamentos, dividas e onus.',
  'inventario-saida': 'Espolio, inventario e saida definitiva do pais.',
  'dependentes-alimentandos': 'Dependentes, alimentandos e informacoes vinculadas.',
  'renda-variavel': 'Operacoes em bolsa, renda variavel e fundos imobiliarios.',
  rra: 'Rendimentos recebidos acumuladamente.',
  'atividade-rural': 'Receitas, despesas e bens da atividade rural.',
  'ganho-capital': 'Operacoes de ganho de capital e importacoes do GCAP.',
  outros: 'Informacoes auxiliares nao classificadas nos grupos principais.',
};

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return value || 'Nao identificado';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return value || 'Nao informado';
  return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
}

function formatBooleanLike(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'sim') return 'Sim';
  if (normalized === '0' || normalized === 'false' || normalized === 'nao') return 'Nao';
  return value;
}

function toTitleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function humanizeFieldLabel(value: string) {
  const raw = value.trim();
  if (!raw) return 'Campo';
  if (FIELD_LABELS[raw]) return FIELD_LABELS[raw];

  const normalized = raw
    .replace(/#/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return toTitleCase(normalized);
}

function normalizePreviewValue(label: string, value: string) {
  if (!value) return 'Nao informado';

  if (label.toLowerCase().includes('cpf')) {
    return formatCpf(value);
  }

  if (label === 'CEP') {
    return formatCep(value);
  }

  if (label === 'Nome' || label === 'Nome da mae' || label === 'Logradouro' || label === 'Bairro' || label === 'Cidade') {
    return toTitleCase(value);
  }

  if (label === 'UF') {
    return value.toUpperCase();
  }

  return formatBooleanLike(value);
}

function buildIdentificationPreview(file: IRDecFileData) {
  return [
    {
      title: 'Dados do contribuinte',
      fields: [
        { label: 'Nome', value: file.name || 'Nao identificado' },
        { label: 'CPF', value: formatCpf(file.cpf) },
        { label: 'Exercicio', value: file.exercise ? String(file.exercise) : 'Nao identificado' },
        { label: 'Ano-calendario', value: file.calendarYear ? String(file.calendarYear) : 'Nao identificado' },
        { label: 'UF', value: file.uf || 'Nao identificado' },
        { label: 'Municipio', value: file.municipalityName || 'Nao identificado' },
        { label: 'Codigo do municipio', value: file.municipalityCode || 'Nao identificado' },
        { label: 'CEP', value: formatCep(file.cep) },
      ],
    },
  ] satisfies PreviewSection[];
}

function buildDecBlockPreview(file: IRDecFileData, blockId: string) {
  const block = file.blocks[blockId];
  if (!block || block.recordCount === 0) return [];

  if (blockId === 'identificacao') {
    return buildIdentificationPreview(file);
  }

  return [
    {
      title: 'Resumo do bloco no arquivo .DEC',
      fields: [
        { label: 'Tipo de arquivo', value: 'Arquivo posicional da Receita (.DEC)' },
        { label: 'Registros encontrados', value: String(block.recordCount) },
        { label: 'Codigos deste bloco', value: block.codes.length ? block.codes.join(', ') : 'Nao mapeado' },
        {
          label: 'Uso na geracao',
          value: file.generationSupported
            ? 'Pode compor o arquivo final em formato .DEC'
            : 'Somente comparativo',
        },
      ],
    },
  ] satisfies PreviewSection[];
}

function parseXmlComparisonText(text: string) {
  const sections = text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return sections.map((chunk) => {
    const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
    const [rawTitle, ...rest] = lines;
    const fields: PreviewField[] = [];
    let currentItem = '';

    for (const line of rest) {
      const keyValueMatch = line.match(/^([^:]+):\s*(.*)$/);
      if (keyValueMatch) {
        const label = humanizeFieldLabel(keyValueMatch[1]);
        const normalizedValue = normalizePreviewValue(label, keyValueMatch[2].trim());
        if (currentItem) {
          fields.push({ label: 'Registro', value: humanizeFieldLabel(currentItem) });
          currentItem = '';
        }
        fields.push({ label, value: normalizedValue });
        continue;
      }

      currentItem = line;
    }

    if (currentItem) {
      fields.push({ label: 'Registro', value: humanizeFieldLabel(currentItem) });
    }

    return {
      title: humanizeFieldLabel(rawTitle || 'Dados encontrados'),
      fields,
    } satisfies PreviewSection;
  });
}

function buildXmlBlockPreview(file: IRDecFileData, blockId: string) {
  const block = file.blocks[blockId];
  if (!block || !block.comparisonText.trim()) return [];

  const sections = parseXmlComparisonText(block.comparisonText);
  if (blockId === 'identificacao') {
    return [...buildIdentificationPreview(file), ...sections];
  }

  return sections;
}

function buildPreviewSections(file: IRDecFileData, blockId: string) {
  return file.sourceFormat === 'xml'
    ? buildXmlBlockPreview(file, blockId)
    : buildDecBlockPreview(file, blockId);
}

function summarizeRecordCount(file: IRDecFileData, blockId: string) {
  return file.blocks[blockId]?.recordCount ?? 0;
}

function encodeLatin1(content: string) {
  const bytes = new Uint8Array(content.length);

  for (let index = 0; index < content.length; index += 1) {
    const code = content.charCodeAt(index);
    bytes[index] = code <= 255 ? code : 63;
  }

  return bytes;
}

async function decodeDecFile(file: File) {
  const buffer = await file.arrayBuffer();
  const decoders = ['utf-8', 'iso-8859-1', 'windows-1252'];

  for (const encoding of decoders) {
    try {
      const decoded = new TextDecoder(encoding, { fatal: false }).decode(buffer);
      if (decoded.startsWith('IRPF') && decoded.includes('T9')) {
        return decoded;
      }
    } catch {
      // Try the next encoding.
    }
  }

  return new TextDecoder('iso-8859-1').decode(buffer);
}

async function decodeXmlFile(file: File) {
  const buffer = await file.arrayBuffer();
  const decoders = ['utf-8', 'iso-8859-1', 'windows-1252'];

  for (const encoding of decoders) {
    try {
      const decoded = new TextDecoder(encoding, { fatal: false }).decode(buffer);
      if (decoded.includes('<classe') || decoded.includes('<?xml')) {
        return decoded;
      }
    } catch {
      // Try the next encoding.
    }
  }

  return new TextDecoder('utf-8').decode(buffer);
}

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? `.${parts.pop()}` : '';
}

async function parseImportedFile(file: File) {
  const extension = getFileExtension(file.name);

  if (extension === '.xml') {
    const content = await decodeXmlFile(file);
    return parseIRXmlContent(file.name, content);
  }

  const content = await decodeDecFile(file);
  if (extension === '.dec' || content.startsWith('IRPF')) {
    return parseIRDecContent(file.name, content);
  }

  if (content.includes('<classe') || content.includes('<?xml')) {
    return parseIRXmlContent(file.name, content);
  }

  throw new Error(`O arquivo ${file.name} nao esta em um formato suportado.`);
}

export function IRDecMerge() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [parsedFileA, setParsedFileA] = useState<IRDecFileData | null>(null);
  const [parsedFileB, setParsedFileB] = useState<IRDecFileData | null>(null);
  const [baseSource, setBaseSource] = useState<FileSource>('arquivoA');
  const [blockSources, setBlockSources] = useState<Record<string, FileSource>>({});
  const [blockDrafts, setBlockDrafts] = useState<Record<string, string>>({});
  const [headerEdits, setHeaderEdits] = useState<IRDecHeaderEdits>({
    exercise: '',
    calendarYear: '',
    cpf: '',
    name: '',
    uf: '',
    municipalityCode: '',
    municipalityName: '',
    cep: '',
  });
  const [suggestedHeaderEdits, setSuggestedHeaderEdits] = useState<IRDecHeaderEdits | null>(null);
  const [baseHeaderEdits, setBaseHeaderEdits] = useState<IRDecHeaderEdits | null>(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [loading, setLoading] = useState(false);

  const ready = Boolean(parsedFileA && parsedFileB);

  const latestComparableFile = useMemo(() => {
    if (!parsedFileA || !parsedFileB) return null;
    return getLatestIRComparableFile([parsedFileA, parsedFileB]);
  }, [parsedFileA, parsedFileB]);

  const baseFile = useMemo(() => {
    if (!parsedFileA || !parsedFileB) return null;
    return getPreferredGenerationBaseFile([parsedFileA, parsedFileB]);
  }, [parsedFileA, parsedFileB]);

  const visibleBlocks = useMemo(() => {
    if (!parsedFileA || !parsedFileB) return [];
    return IR_DEC_BLOCK_DEFINITIONS.filter((definition) => {
      return (
        summarizeRecordCount(parsedFileA, definition.id) > 0 ||
        summarizeRecordCount(parsedFileB, definition.id) > 0
      );
    });
  }, [parsedFileA, parsedFileB]);

  function renderPreviewCard(file: IRDecFileData, blockId: string, sourceLabel: string) {
    const sections = buildPreviewSections(file, blockId);
    const rawText = getBlockText(file, blockId);

    return (
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{sourceLabel}</p>
            <p className="text-xs text-muted-foreground">
              {file.sourceFormat === 'xml'
                ? 'Leitura organizada a partir da declaracao pre-preenchida.'
                : 'Resumo do arquivo posicional que servira de base para o .DEC.'}
            </p>
          </div>
          <Badge variant="outline">{file.sourceFormat.toUpperCase()}</Badge>
        </div>

        {sections.length > 0 ? (
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div key={`${sourceLabel}-${blockId}-${section.title}-${index}`} className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm font-semibold">{section.title}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {section.fields.length > 0 ? (
                    section.fields.map((field, fieldIndex) => (
                      <div key={`${section.title}-${field.label}-${fieldIndex}`} className="space-y-1 rounded-md bg-background p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{field.label}</p>
                        <p className="text-sm font-medium leading-5">{field.value}</p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md bg-background p-3 text-sm text-muted-foreground">
                      Nenhum detalhe adicional encontrado neste trecho.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
            Sem informacoes resumidas para este bloco.
          </div>
        )}

        <details className="rounded-lg border bg-background p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Ver texto tecnico do arquivo
          </summary>
          <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
            {rawText || 'Sem informacoes tecnicas neste bloco.'}
          </pre>
        </details>
      </div>
    );
  }

  function resetImportedState() {
    setParsedFileA(null);
    setParsedFileB(null);
    setBlockSources({});
    setBlockDrafts({});
    setHeaderEdits({
      exercise: '',
      calendarYear: '',
      cpf: '',
      name: '',
      uf: '',
      municipalityCode: '',
      municipalityName: '',
      cep: '',
    });
    setSuggestedHeaderEdits(null);
    setBaseHeaderEdits(null);
    setBaseSource('arquivoA');
    setActiveTab('upload');
  }

  function getSelectedFile(source: FileSource) {
    return source === 'arquivoA' ? parsedFileA : parsedFileB;
  }

  function getOppositeFile(source: FileSource) {
    return source === 'arquivoA' ? parsedFileB : parsedFileA;
  }

  function getEffectiveDraftInfo(blockId: string) {
    const selectedSource = blockSources[blockId] ?? 'arquivoA';
    const selectedFile = getSelectedFile(selectedSource);
    const oppositeSource: FileSource = selectedSource === 'arquivoA' ? 'arquivoB' : 'arquivoA';
    const oppositeFile = getOppositeFile(selectedSource);

    if (selectedFile) {
      const selectedEditableText = getBlockEditableText(selectedFile, blockId);
      if (selectedEditableText) {
        return {
          selectedSource,
          effectiveSource: selectedSource,
          effectiveFile: selectedFile,
          usedFallback: false,
          text: selectedEditableText,
        };
      }
    }

    if (oppositeFile) {
      const oppositeEditableText = getBlockEditableText(oppositeFile, blockId);
      if (oppositeEditableText) {
        return {
          selectedSource,
          effectiveSource: oppositeSource,
          effectiveFile: oppositeFile,
          usedFallback: true,
          text: oppositeEditableText,
        };
      }
    }

    return {
      selectedSource,
      effectiveSource: selectedSource,
      effectiveFile: selectedFile,
      usedFallback: false,
      text: '',
    };
  }

  function reapplyDraftSuggestion(blockId: string) {
    const draftInfo = getEffectiveDraftInfo(blockId);
    if (!draftInfo.text) {
      toast.error('Nao existe texto .DEC disponivel para reaplicar neste bloco.');
      return;
    }

    setBlockDrafts((previous) => ({
      ...previous,
      [blockId]: draftInfo.text,
    }));

    if (draftInfo.usedFallback) {
      toast.info(
        `Bloco restaurado com o texto DEC do ${FILE_SOURCE_LABEL[draftInfo.effectiveSource]}, pois o arquivo selecionado esta em XML.`
      );
      return;
    }

    toast.success(`Bloco restaurado com o texto do ${FILE_SOURCE_LABEL[draftInfo.effectiveSource]}.`);
  }

  function handleFileSelection(source: FileSource, event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;

    if (source === 'arquivoA') setFileA(selectedFile);
    if (source === 'arquivoB') setFileB(selectedFile);

    resetImportedState();
  }

  async function handleImportFiles() {
    if (!fileA || !fileB) {
      toast.error('Selecione os dois arquivos para continuar.');
      return;
    }

    const validateFileName = (file: File) => {
      const loweredName = file.name.toLowerCase();
      const hasValidExtension = ACCEPTED_EXTENSIONS.some((extension) => loweredName.endsWith(extension));
      if (!hasValidExtension) {
        throw new Error(`O arquivo ${file.name} esta fora do padrao. Envie somente arquivos .DEC ou .XML.`);
      }
    };

    setLoading(true);

    try {
      validateFileName(fileA);
      validateFileName(fileB);

      const [parsedA, parsedB] = await Promise.all([parseImportedFile(fileA), parseImportedFile(fileB)]);
      const preferredBase = getPreferredGenerationBaseFile([parsedA, parsedB]);

      if (!preferredBase) {
        throw new Error('Envie pelo menos um arquivo .DEC, pois a geracao final ainda depende de um leiaute posicional.');
      }

      const latestComparable = getLatestIRComparableFile([parsedA, parsedB]);
      const latestSource: FileSource = latestComparable === parsedA ? 'arquivoA' : 'arquivoB';
      const generationBaseSource: FileSource = preferredBase === parsedA ? 'arquivoA' : 'arquivoB';
      const secondarySource: FileSource = generationBaseSource === 'arquivoA' ? 'arquivoB' : 'arquivoA';
      const secondaryFile = generationBaseSource === 'arquivoA' ? parsedB : parsedA;
      const sourceMap = buildDefaultSourceMap(preferredBase, secondaryFile, generationBaseSource, secondarySource);
      const drafts = buildInitialDrafts(sourceMap, parsedA, parsedB);
      const mergedHeaders = mergeHeaderEdits(
        buildHeaderEditsFromFile(latestComparable),
        buildHeaderEditsFromFile(preferredBase)
      );

      setParsedFileA(parsedA);
      setParsedFileB(parsedB);
      setBaseSource(generationBaseSource);
      setBlockSources(sourceMap);
      setBlockDrafts(drafts);
      setHeaderEdits(mergedHeaders);
      setSuggestedHeaderEdits(mergedHeaders);
      setBaseHeaderEdits(buildHeaderEditsFromFile(preferredBase));
      setActiveTab('blocos');

      if (parsedA.sourceFormat === 'xml' || parsedB.sourceFormat === 'xml') {
        toast.success(
          `Arquivos importados com sucesso. O ${FILE_SOURCE_LABEL[latestSource]} em XML sera usado como comparativo por blocos.`
        );
      } else {
        toast.success('Arquivos importados com sucesso. Agora escolha os blocos para montar o novo .DEC.');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Nao foi possivel importar os arquivos informados.');
    } finally {
      setLoading(false);
    }
  }

  function updateBlockSource(blockId: string, source: FileSource) {
    if (!parsedFileA || !parsedFileB) return;

    setBlockSources((previous) => ({ ...previous, [blockId]: source }));

    const selectedFile = source === 'arquivoA' ? parsedFileA : parsedFileB;
    const editableText = getBlockEditableText(selectedFile, blockId);
    if (editableText) {
      setBlockDrafts((previous) => ({ ...previous, [blockId]: editableText }));
      return;
    }

    const oppositeFile = source === 'arquivoA' ? parsedFileB : parsedFileA;
    const fallbackEditableText = getBlockEditableText(oppositeFile, blockId);
    if (fallbackEditableText) {
      setBlockDrafts((previous) => ({ ...previous, [blockId]: fallbackEditableText }));
      toast.info('O XML entrou apenas como comparativo. Mantive o texto DEC do outro arquivo neste bloco.');
      return;
    }

    toast.info('O XML entra como comparativo nesse bloco. Revise o preview e ajuste o texto DEC manualmente, se necessario.');
  }

  function updateHeaderField(field: keyof IRDecHeaderEdits, value: string) {
    setHeaderEdits((previous) => ({ ...previous, [field]: value }));
  }

  function handleGenerateFile() {
    if (!baseFile) {
      toast.error('Importe os arquivos antes de gerar o novo .DEC.');
      return;
    }

    try {
      const generatedContent = generateMergedIRDec(baseFile, blockDrafts, headerEdits);
      const exercise = headerEdits.exercise || String(baseFile.exercise || '');
      const calendarYear = headerEdits.calendarYear || String(baseFile.calendarYear || '');
      const cpf = headerEdits.cpf || baseFile.cpf || 'sem-cpf';
      const outputName = `${cpf.replace(/\D/g, '') || 'irpf'}-IRPF-${exercise}-${calendarYear}-mesclado.DEC`;
      const blob = new Blob([encodeLatin1(generatedContent)], { type: 'application/octet-stream' });

      saveAs(blob, outputName);
      toast.success('Arquivo .DEC gerado com sucesso.');
    } catch (error: any) {
      toast.error(error?.message || 'Nao foi possivel gerar o arquivo final.');
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link href="/admin/pessoa-fisica/imposto-renda">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitMerge className="h-5 w-5" />
                Gerar Arquivo IR
              </CardTitle>
              <CardDescription>
                Compare dois arquivos .DEC ou um .DEC com a pre-preenchida em .XML e gere um novo .DEC a partir da base posicional.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-4">
              <Label htmlFor="arquivoA">Arquivo 1 (.DEC ou .XML)</Label>
              <Input id="arquivoA" type="file" accept=".DEC,.dec,.XML,.xml" onChange={(event) => handleFileSelection('arquivoA', event)} />
              <p className="text-xs text-muted-foreground">
                Use o .DEC do exercicio anterior ou o XML da pre-preenchida vigente.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border p-4">
              <Label htmlFor="arquivoB">Arquivo 2 (.DEC ou .XML)</Label>
              <Input id="arquivoB" type="file" accept=".DEC,.dec,.XML,.xml" onChange={(event) => handleFileSelection('arquivoB', event)} />
              <p className="text-xs text-muted-foreground">
                A rotina compara blocos entre os dois arquivos, mas a geracao final continua exigindo ao menos um .DEC.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            O XML entra como referencia comparativa por tags e colecoes. O arquivo final continua sendo gerado em <strong>.DEC</strong> usando o leiaute do arquivo posicional importado.
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleImportFiles} disabled={loading || !fileA || !fileB}>
              <Upload className="mr-2 h-4 w-4" />
              {loading ? 'Importando...' : 'Importar Arquivos'}
            </Button>
            <Button variant="outline" onClick={resetImportedState} disabled={loading}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {ready && parsedFileA && parsedFileB && latestComparableFile && baseFile && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {[{ source: 'arquivoA' as FileSource, file: parsedFileA }, { source: 'arquivoB' as FileSource, file: parsedFileB }].map(({ source, file }) => (
              <Card key={source}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span>{FILE_SOURCE_LABEL[source]}</span>
                    <div className="flex gap-2">
                      <Badge variant="outline">{file.sourceFormat.toUpperCase()}</Badge>
                      {baseFile === file && <Badge className="bg-orange-500 text-white">Base de Geracao</Badge>}
                      {latestComparableFile === file && <Badge variant="secondary">Mais Recente</Badge>}
                    </div>
                  </CardTitle>
                  <CardDescription>{file.fileName}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Exercicio</span>
                    <span className="font-medium">{file.exercise || 'Nao identificado'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ano-calendario</span>
                    <span className="font-medium">{file.calendarYear || 'Nao identificado'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Contribuinte</span>
                    <span className="truncate text-right font-medium">{file.name || 'Nao identificado'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">CPF</span>
                    <span className="font-medium">{formatCpf(file.cpf)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Comparacao</span>
                    <span className="font-medium">{file.availableBlockIds.length} blocos</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">Resumo</TabsTrigger>
              <TabsTrigger value="blocos">Blocos</TabsTrigger>
              <TabsTrigger value="geracao">Geracao</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo da Comparacao</CardTitle>
                  <CardDescription>
                    O arquivo final sera gerado com base no {FILE_SOURCE_LABEL[baseSource]}, enquanto o arquivo mais recente ajuda a sugerir o cabecalho do exercicio vigente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg border p-4">
                    <p className="font-medium">Base de geracao</p>
                    <p className="text-muted-foreground">
                      {baseFile.fileName} ({baseFile.sourceFormat.toUpperCase()}) - Exercicio {baseFile.exercise || 'Nao identificado'} / Ano-calendario {baseFile.calendarYear || 'Nao identificado'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="font-medium">Arquivo mais recente</p>
                    <p className="text-muted-foreground">
                      {latestComparableFile.fileName} ({latestComparableFile.sourceFormat.toUpperCase()}) - Exercicio {latestComparableFile.exercise || 'Nao identificado'} / Ano-calendario {latestComparableFile.calendarYear || 'Nao identificado'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="font-medium">Blocos disponiveis para escolha</p>
                    <p className="text-muted-foreground">
                      {visibleBlocks.length} blocos identificados. Se um dos lados for XML, ele aparece como comparativo e o texto final do .DEC permanece editavel na aba <strong>Blocos</strong>.
                    </p>
                  </div>
                  {suggestedHeaderEdits && baseHeaderEdits && (
                    <div className="rounded-lg border p-4">
                      <p className="font-medium">Cabecalho sugerido</p>
                      <p className="text-muted-foreground">
                        O sistema mescla os dados do arquivo mais recente com a base `.DEC`. Na aba <strong>Geracao</strong> voce pode reaplicar essa sugestao ou voltar ao cabecalho original do `.DEC` base.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blocos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Escolha por Blocos</CardTitle>
                  <CardDescription>
                    O Vision separa os registros por blocos. Quando houver XML, o preview mostra as tags mapeadas para a estrutura correspondente do .DEC.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {visibleBlocks.map((block) => {
                      const source = blockSources[block.id] ?? 'arquivoA';
                      const draftInfo = getEffectiveDraftInfo(block.id);

                      return (
                        <AccordionItem key={block.id} value={block.id}>
                          <AccordionTrigger>
                            <div className="flex w-full flex-col gap-2 text-left md:flex-row md:items-center md:justify-between">
                              <div>
                                <div className="font-medium">{block.title}</div>
                                <div className="text-xs text-muted-foreground">{block.description}</div>
                              </div>
                              <div className="flex flex-wrap gap-2 pr-4 text-xs">
                                <Badge variant="outline">
                                  {FILE_SOURCE_LABEL[source]} selecionado
                                </Badge>
                                <Badge variant="outline">Arquivo 1: {summarizeRecordCount(parsedFileA, block.id)} itens</Badge>
                                <Badge variant="outline">Arquivo 2: {summarizeRecordCount(parsedFileB, block.id)} itens</Badge>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant={source === 'arquivoA' ? 'default' : 'outline'}
                                onClick={() => updateBlockSource(block.id, 'arquivoA')}
                              >
                                {parsedFileA.sourceFormat === 'xml' ? 'Usar dados do Arquivo 1 como referencia' : 'Usar dados do Arquivo 1'}
                              </Button>
                              <Button
                                type="button"
                                variant={source === 'arquivoB' ? 'default' : 'outline'}
                                onClick={() => updateBlockSource(block.id, 'arquivoB')}
                              >
                                {parsedFileB.sourceFormat === 'xml' ? 'Usar dados do Arquivo 2 como referencia' : 'Usar dados do Arquivo 2'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => reapplyDraftSuggestion(block.id)}
                              >
                                Reaplicar Texto DEC
                              </Button>
                            </div>

                            <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                              <p className="font-medium text-foreground">{BLOCK_DECLARATION_HINT[block.id] || block.description}</p>
                              {draftInfo.text ? (
                                draftInfo.usedFallback ? (
                                  <p className="mt-1">O arquivo selecionado esta em XML neste bloco. O texto editavel do `.DEC` veio do {FILE_SOURCE_LABEL[draftInfo.effectiveSource]}.</p>
                                ) : (
                                  <p className="mt-1">O texto editavel deste bloco esta vindo do {FILE_SOURCE_LABEL[draftInfo.effectiveSource]}.</p>
                                )
                              ) : (
                                <p className="mt-1">Nenhum dos arquivos trouxe texto `.DEC` pronto para este bloco. Use o comparativo abaixo e monte o bloco manualmente, se necessario.</p>
                              )}
                            </div>

                            <div className="grid gap-4 xl:grid-cols-2">
                              {renderPreviewCard(parsedFileA, block.id, 'Arquivo 1')}
                              {renderPreviewCard(parsedFileB, block.id, 'Arquivo 2')}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`draft-${block.id}`}>Texto final que sera gravado no bloco (.DEC)</Label>
                              <Textarea
                                id={`draft-${block.id}`}
                                value={blockDrafts[block.id] || ''}
                                onChange={(event) =>
                                  setBlockDrafts((previous) => ({
                                    ...previous,
                                    [block.id]: event.target.value,
                                  }))
                                }
                                className="min-h-[220px] font-mono text-xs"
                              />
                              <p className="text-xs text-muted-foreground">
                                Use a leitura organizada acima para decidir qual arquivo representa melhor este bloco. O campo abaixo continua sendo o texto posicional final que sera salvo no .DEC.
                              </p>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="geracao" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCog className="h-5 w-5" />
                    Dados para o Novo Arquivo
                  </CardTitle>
                  <CardDescription>
                    Estes campos ajustam o cabecalho principal do arquivo final. O XML mais recente ajuda a sugerir os dados do exercicio vigente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="exercise">Exercicio</Label>
                    <Input
                      id="exercise"
                      value={headerEdits.exercise}
                      onChange={(event) => updateHeaderField('exercise', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calendarYear">Ano-calendario</Label>
                    <Input
                      id="calendarYear"
                      value={headerEdits.calendarYear}
                      onChange={(event) => updateHeaderField('calendarYear', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={headerEdits.cpf}
                      onChange={(event) => updateHeaderField('cpf', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uf">UF</Label>
                    <Input
                      id="uf"
                      value={headerEdits.uf}
                      onChange={(event) => updateHeaderField('uf', event.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">Nome do contribuinte</Label>
                    <Input
                      id="name"
                      value={headerEdits.name}
                      onChange={(event) => updateHeaderField('name', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="municipalityCode">Codigo do municipio</Label>
                    <Input
                      id="municipalityCode"
                      value={headerEdits.municipalityCode}
                      onChange={(event) => updateHeaderField('municipalityCode', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={headerEdits.cep}
                      onChange={(event) => updateHeaderField('cep', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="municipalityName">Municipio</Label>
                    <Input
                      id="municipalityName"
                      value={headerEdits.municipalityName}
                      onChange={(event) => updateHeaderField('municipalityName', event.target.value)}
                    />
                  </div>
                </CardContent>
                {suggestedHeaderEdits && baseHeaderEdits && (
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setHeaderEdits(suggestedHeaderEdits)}
                      >
                        Reaplicar Cabecalho Sugerido
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setHeaderEdits(baseHeaderEdits)}
                      >
                        Restaurar Cabecalho do DEC Base
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gerar Arquivo Final</CardTitle>
                  <CardDescription>
                    O download gera um novo arquivo .DEC com base no {FILE_SOURCE_LABEL[baseSource]} e nos blocos ajustados manualmente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    A comparacao com XML serve para orientar o preenchimento e a revisao dos blocos. O arquivo final segue o leiaute do .DEC base importado.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleGenerateFile}>
                      <Download className="mr-2 h-4 w-4" />
                      Gerar Novo Arquivo .DEC
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('blocos')}>
                      Voltar aos Blocos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
