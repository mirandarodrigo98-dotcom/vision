'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { saveAs } from 'file-saver';
import {
  buildDefaultSourceMap,
  buildHeaderEditsFromFile,
  buildInitialDrafts,
  generateMergedIRDec,
  getBlockText,
  getLatestIRDecFile,
  IR_DEC_BLOCK_DEFINITIONS,
  IRDecFileData,
  IRDecHeaderEdits,
  parseIRDecContent,
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

const ACCEPTED_DEC_EXTENSIONS = ['.dec'];

const FILE_SOURCE_LABEL: Record<FileSource, string> = {
  arquivoA: 'Arquivo 1',
  arquivoB: 'Arquivo 2',
};

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return value || 'Nao identificado';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function summarizeRecordCount(file: IRDecFileData, blockId: string) {
  return file.blocks[blockId]?.records.length ?? 0;
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
  const [activeTab, setActiveTab] = useState('upload');
  const [loading, setLoading] = useState(false);

  const ready = Boolean(parsedFileA && parsedFileB);

  const latestFile = useMemo(() => {
    if (!parsedFileA || !parsedFileB) return null;
    return getLatestIRDecFile([parsedFileA, parsedFileB]);
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

  const baseFile = baseSource === 'arquivoA' ? parsedFileA : parsedFileB;

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
    setBaseSource('arquivoA');
  }

  function handleFileSelection(source: FileSource, event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;

    if (source === 'arquivoA') setFileA(selectedFile);
    if (source === 'arquivoB') setFileB(selectedFile);

    resetImportedState();
  }

  async function handleImportFiles() {
    if (!fileA || !fileB) {
      toast.error('Selecione os dois arquivos .DEC para continuar.');
      return;
    }

    const validateFileName = (file: File) => {
      const loweredName = file.name.toLowerCase();
      const hasValidExtension = ACCEPTED_DEC_EXTENSIONS.some((extension) => loweredName.endsWith(extension));
      if (!hasValidExtension) {
        throw new Error(`O arquivo ${file.name} esta fora do padrao. Envie somente arquivos .DEC.`);
      }
    };

    setLoading(true);

    try {
      validateFileName(fileA);
      validateFileName(fileB);

      const [contentA, contentB] = await Promise.all([decodeDecFile(fileA), decodeDecFile(fileB)]);
      const parsedA = parseIRDecContent(fileA.name, contentA);
      const parsedB = parseIRDecContent(fileB.name, contentB);
      const latest = getLatestIRDecFile([parsedA, parsedB]);
      const latestSource: FileSource = latest === parsedA ? 'arquivoA' : 'arquivoB';
      const secondarySource: FileSource = latestSource === 'arquivoA' ? 'arquivoB' : 'arquivoA';
      const sourceMap = buildDefaultSourceMap(
        latest,
        latestSource === 'arquivoA' ? parsedB : parsedA,
        latestSource,
        secondarySource
      );
      const drafts = buildInitialDrafts(sourceMap, parsedA, parsedB);

      setParsedFileA(parsedA);
      setParsedFileB(parsedB);
      setBaseSource(latestSource);
      setBlockSources(sourceMap);
      setBlockDrafts(drafts);
      setHeaderEdits(buildHeaderEditsFromFile(latest));
      setActiveTab('blocos');

      toast.success('Arquivos importados com sucesso. Agora escolha os blocos para montar o novo .DEC.');
    } catch (error: any) {
      toast.error(error?.message || 'Nao foi possivel importar os arquivos .DEC.');
    } finally {
      setLoading(false);
    }
  }

  function updateBlockSource(blockId: string, source: FileSource) {
    if (!parsedFileA || !parsedFileB) return;

    const file = source === 'arquivoA' ? parsedFileA : parsedFileB;
    setBlockSources((previous) => ({ ...previous, [blockId]: source }));
    setBlockDrafts((previous) => ({ ...previous, [blockId]: getBlockText(file, blockId) }));
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
                Importe dois arquivos .DEC, escolha o que aproveitar de cada declaracao e gere um novo arquivo no leiaute do exercicio mais recente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 rounded-lg border p-4">
              <Label htmlFor="arquivoA">Arquivo 1 (.DEC)</Label>
              <Input id="arquivoA" type="file" accept=".DEC,.dec" onChange={(event) => handleFileSelection('arquivoA', event)} />
              <p className="text-xs text-muted-foreground">
                Envie um arquivo da declaracao original ou de outra declaracao que sera usada na mesclagem.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border p-4">
              <Label htmlFor="arquivoB">Arquivo 2 (.DEC)</Label>
              <Input id="arquivoB" type="file" accept=".DEC,.dec" onChange={(event) => handleFileSelection('arquivoB', event)} />
              <p className="text-xs text-muted-foreground">
                Pode ser do mesmo exercicio ou de exercicio e ano-calendario diferentes.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            A validacao verifica extensao <strong>.DEC</strong>, cabecalho <strong>IRPF</strong> e o trailer <strong>T9</strong>. Se o arquivo estiver fora do padrao, a rotina bloqueia a importacao.
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

      {ready && parsedFileA && parsedFileB && latestFile && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {[{ source: 'arquivoA' as FileSource, file: parsedFileA }, { source: 'arquivoB' as FileSource, file: parsedFileB }].map(({ source, file }) => (
              <Card key={source}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span>{FILE_SOURCE_LABEL[source]}</span>
                    {latestFile === file && <Badge className="bg-orange-500 text-white">Leiaute Base</Badge>}
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
                    <span className="text-muted-foreground">Registros</span>
                    <span className="font-medium">{file.lines.length}</span>
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
                  <CardTitle>Resumo da Mesclagem</CardTitle>
                  <CardDescription>
                    O arquivo final sera gerado usando o leiaute do exercicio mais recente, atualmente vindo do {FILE_SOURCE_LABEL[baseSource]}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg border p-4">
                    <p className="font-medium">Base de geracao</p>
                    <p className="text-muted-foreground">
                      Exercicio {latestFile.exercise} / Ano-calendario {latestFile.calendarYear} - {latestFile.fileName}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="font-medium">Blocos disponiveis para escolha</p>
                    <p className="text-muted-foreground">
                      {visibleBlocks.length} blocos identificados. Use a aba <strong>Blocos</strong> para escolher qual arquivo usar em cada parte e editar o conteudo quando necessario.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="blocos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Escolha por Blocos</CardTitle>
                  <CardDescription>
                    O Vision separa os registros por blocos para facilitar a visualizacao. Em cada bloco voce pode escolher a origem e ajustar o texto antes de gerar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {visibleBlocks.map((block) => {
                      const source = blockSources[block.id] ?? 'arquivoA';

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
                                <Badge variant="outline">Arquivo 1: {summarizeRecordCount(parsedFileA, block.id)} reg.</Badge>
                                <Badge variant="outline">Arquivo 2: {summarizeRecordCount(parsedFileB, block.id)} reg.</Badge>
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
                                Usar Arquivo 1
                              </Button>
                              <Button
                                type="button"
                                variant={source === 'arquivoB' ? 'default' : 'outline'}
                                onClick={() => updateBlockSource(block.id, 'arquivoB')}
                              >
                                Usar Arquivo 2
                              </Button>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-2">
                              <div className="space-y-2 rounded-lg border p-3">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <FileText className="h-4 w-4" />
                                  Preview do Arquivo 1
                                </div>
                                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                                  {getBlockText(parsedFileA, block.id) || 'Sem registros neste bloco.'}
                                </pre>
                              </div>

                              <div className="space-y-2 rounded-lg border p-3">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <FileText className="h-4 w-4" />
                                  Preview do Arquivo 2
                                </div>
                                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                                  {getBlockText(parsedFileB, block.id) || 'Sem registros neste bloco.'}
                                </pre>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`draft-${block.id}`}>Conteudo final do bloco</Label>
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
                                Se precisar, voce pode ajustar manualmente o texto deste bloco antes da geracao do novo arquivo.
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
                    Estes campos ajustam o cabecalho principal do arquivo final. Para alteracoes mais profundas, edite os blocos diretamente na aba anterior.
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
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gerar Arquivo Final</CardTitle>
                  <CardDescription>
                    O download gera um novo arquivo .DEC com os blocos escolhidos e mantem o leiaute do exercicio mais recente importado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    O arquivo sera montado com base no {FILE_SOURCE_LABEL[baseSource]}, que contem o exercicio mais recente. Os blocos selecionados podem vir de qualquer um dos arquivos importados.
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
