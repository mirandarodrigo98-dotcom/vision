'use client';

// Updated: Module tokens removed, using Global Token only.

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit, Upload, Copy, RefreshCw } from 'lucide-react';
import {
  saveQuestorSynConfig,
  getQuestorSynRoutines,
  saveQuestorSynRoutine,
  deleteQuestorSynRoutine,
  fetchQuestorRoutineParams,
  testQuestorConnectivity
} from '@/app/actions/integrations/questor-syn';
import {
  QuestorSynConfig,
  QuestorSynRoutine
} from '@/types/questor-syn';

interface QuestorSynManagerProps {
  initialConfig?: QuestorSynConfig;
  initialRoutines: QuestorSynRoutine[];
}

export function QuestorSynManager({ initialConfig, initialRoutines }: QuestorSynManagerProps) {
  const [config, setConfig] = useState<QuestorSynConfig>(initialConfig || { base_url: 'http://localhost:8080', api_token: '' });
  const [routines, setRoutines] = useState<QuestorSynRoutine[]>(initialRoutines);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRoutine, setCurrentRoutine] = useState<Partial<QuestorSynRoutine>>({});

  const handleDiagnose = async () => {
    setIsLoading(true);
    setDiagnosticResult(null);
    try {
      const response = await fetch('/api/admin/questor/diagnose');
      const data = await response.json();
      setDiagnosticResult(data);
      if (data.success) {
        toast.success(`Diagnóstico concluído: Usuário ${data.details.possibleUser}`);
      } else {
        toast.error(`Diagnóstico falhou: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao executar diagnóstico');
    } finally {
      setIsLoading(false);
    }
  };

  // Config Handlers
  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      await saveQuestorSynConfig(config);
      toast.success('Configurações salvas com sucesso');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  // Routine Handlers
  const handleSaveRoutine = async () => {
    if (!currentRoutine.name || !currentRoutine.action_name || !currentRoutine.type) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setIsLoading(true);
    try {
      await saveQuestorSynRoutine(currentRoutine as QuestorSynRoutine);
      toast.success('Rotina salva com sucesso');
      setIsDialogOpen(false);
      // Refresh list
      const updated = await getQuestorSynRoutines();
      setRoutines(updated);
    } catch {
      toast.error('Erro ao salvar rotina');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta rotina?')) return;
    
    setIsLoading(true);
    try {
      await deleteQuestorSynRoutine(id);
      toast.success('Rotina excluída');
      setRoutines(routines.filter(r => r.id !== id));
    } catch {
      toast.error('Erro ao excluir rotina');
    } finally {
      setIsLoading(false);
    }
  };

  const openNewRoutine = () => {
    setCurrentRoutine({
      name: '',
      action_name: '',
      type: 'PROCESS',
      description: '',
      parameters_schema: '{}',
      layout_content: '',
      system_code: '',
      is_active: true
    });
    setIsDialogOpen(true);
  };

  const openEditRoutine = (routine: QuestorSynRoutine) => {
    setCurrentRoutine(routine);
    setIsDialogOpen(true);
  };

  const verifyRoutineParams = async () => {
    if (!currentRoutine.action_name) {
      toast.error('Informe o Nome da Ação para verificar');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetchQuestorRoutineParams(currentRoutine.action_name);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success('Parâmetros encontrados!');
        // Update schema with found params
        const schema = JSON.stringify(res.data, null, 2);
        setCurrentRoutine(prev => ({ ...prev, parameters_schema: schema }));
      }
    } catch {
      toast.error('Erro ao verificar parâmetros');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTestConnectivity = async () => {
    setIsVerifying(true);
    try {
      const res = await testQuestorConnectivity();
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Conexão OK! Versão: ${JSON.stringify(res.version)}`);
      }
    } catch {
      toast.error('Erro ao testar conexão');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.nli')) {
      toast.error('Selecione um arquivo .nli');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      // Extract name from file if empty
      const fileName = file.name;
      
      setCurrentRoutine(prev => ({
        ...prev,
        action_name: prev.action_name || fileName,
        layout_content: content
      }));
      toast.success('Arquivo NLI carregado!');
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="config" className="w-full">
        <TabsList>
          <TabsTrigger value="config">Configuração Global</TabsTrigger>
          <TabsTrigger value="routines">Cadastro de Rotinas</TabsTrigger>
          <TabsTrigger value="test">Teste de Integração</TabsTrigger>
        </TabsList>

        {/* --- Config Tab --- */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do nWeb (SYN Privado)</CardTitle>
              <CardDescription>
                Defina o endereço do serviço nWeb local ou remoto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>URL Interna (Rede Local)</Label>
                  <Input 
                    value={config.internal_url || ''} 
                    onChange={(e) => setConfig({ ...config, internal_url: e.target.value })}
                    placeholder="http://192.168.x.x:8080"
                  />
                  <p className="text-xs text-muted-foreground">Prioridade 1: Acesso rápido na rede local.</p>
                </div>
                
                <div className="space-y-2">
                  <Label>URL Externa (DDNS/IP Fixo)</Label>
                  <Input 
                    value={config.external_url || ''} 
                    onChange={(e) => setConfig({ ...config, external_url: e.target.value })}
                    placeholder="http://meudominio.com:8080"
                  />
                  <p className="text-xs text-muted-foreground">Prioridade 2: Acesso remoto via internet.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Token de API (Opcional)</Label>
                <Input 
                  value={config.api_token || ''} 
                  onChange={(e) => setConfig({ ...config, api_token: e.target.value })}
                  placeholder="Se necessário"
                  type="password"
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <Button onClick={handleSaveConfig} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Salvar Configuração
                  </Button>
                  <Button onClick={handleDiagnose} variant="outline" disabled={isLoading}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Diagnóstico de Autenticação
                  </Button>
                </div>

                {diagnosticResult && (
                  <div className="p-4 border rounded bg-muted text-sm font-mono overflow-auto max-h-96 whitespace-pre-wrap">
                    <div className="flex items-center gap-2 mb-2">
                      <strong>Status:</strong> 
                      <span className={diagnosticResult.success ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                        {diagnosticResult.success ? 'SUCESSO' : 'FALHA'}
                      </span>
                    </div>
                    
                    {diagnosticResult.details && (
                      <div className="space-y-3">
                        <div className="p-2 bg-background border rounded">
                          <p className="text-lg font-semibold text-primary">Usuário Identificado: {diagnosticResult.details.possibleUser}</p>
                          <p className="text-muted-foreground">Status HTTP: {diagnosticResult.details.status}</p>
                        </div>
                        
                        <div>
                          <strong>Headers de Resposta:</strong>
                          <pre className="text-xs mt-1 bg-black/5 p-2 rounded overflow-auto">
                            {JSON.stringify(diagnosticResult.details.headers, null, 2)}
                          </pre>
                        </div>
                        
                        <div>
                          <strong>Corpo da Resposta (Início):</strong>
                          <pre className="text-xs mt-1 bg-black/5 p-2 rounded overflow-auto">
                            {typeof diagnosticResult.details.body === 'string' 
                              ? diagnosticResult.details.body.substring(0, 1000) 
                              : JSON.stringify(diagnosticResult.details.body, null, 2).substring(0, 1000)
                            }
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {!diagnosticResult.success && (
                      <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded">
                        {diagnosticResult.message || diagnosticResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Routines Tab --- */}
        <TabsContent value="routines">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Rotinas do Questor</CardTitle>
                <CardDescription>
                  Cadastre as rotinas (Actions) que serão utilizadas pelo sistema.
                </CardDescription>
              </div>
              <Button onClick={openNewRoutine}>
                <Plus className="mr-2 h-4 w-4" /> Nova Rotina
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Ação Interna (_AActionName)</TableHead>
                    <TableHead>Código do Sistema</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routines.map((routine) => (
                    <TableRow key={routine.id}>
                      <TableCell className="font-medium">{routine.name}</TableCell>
                      <TableCell className="font-mono text-xs">{routine.action_name}</TableCell>
                      <TableCell className="font-mono text-xs text-primary">{routine.system_code || '-'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                          {routine.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {routine.is_active ? (
                          <span className="text-green-600 text-xs font-bold">Ativo</span>
                        ) : (
                          <span className="text-gray-400 text-xs">Inativo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditRoutine(routine)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRoutine(routine.id!)} className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {routines.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma rotina cadastrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Test Tab --- */}
        <TabsContent value="test">
           <Card>
            <CardHeader>
              <CardTitle>Teste de Conectividade</CardTitle>
              <CardDescription>
                Verifique se o nWeb está respondendo corretamente usando a configuração global.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-4 border rounded bg-slate-50 space-y-4">
                    <p className="text-sm">Endpoint de Versão: <code>/TnWebDMDadosGerais/PegarVersaoQuestor</code></p>
                    <Button 
                      onClick={handleTestConnectivity} 
                      disabled={isVerifying}
                    >
                        {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Testar Conexão Global
                    </Button>
                </div>
            </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      {/* --- Routine Dialog --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{currentRoutine.id ? 'Editar Rotina' : 'Nova Rotina'}</DialogTitle>
            <DialogDescription>
              Preencha os dados da rotina conforme documentação do Questor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Amigável</Label>
                <Input 
                  value={currentRoutine.name} 
                  onChange={(e) => setCurrentRoutine({...currentRoutine, name: e.target.value})}
                  placeholder="Ex: Importar Sócios"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={currentRoutine.type} 
                  onValueChange={(val: QuestorSynRoutine['type']) => setCurrentRoutine({...currentRoutine, type: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROCESS">Processo</SelectItem>
                    <SelectItem value="QUERY">Consulta</SelectItem>
                    <SelectItem value="REPORT">Relatório</SelectItem>
                    <SelectItem value="IMPORT">Importação (NLI)</SelectItem>
                    <SelectItem value="EXPORT">Exportação (NLI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ação Interna / Nome do Arquivo</Label>
                <div className="flex gap-2">
                  <Input 
                    value={currentRoutine.action_name} 
                    onChange={(e) => setCurrentRoutine({...currentRoutine, action_name: e.target.value})}
                    placeholder={currentRoutine.type === 'IMPORT' ? "Ex: ImportacaoContabil.nli" : "Ex: RelatorioContabilv2"}
                    className="font-mono flex-1"
                  />
                  {currentRoutine.type !== 'IMPORT' && (
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={verifyRoutineParams} 
                      disabled={isVerifying || !currentRoutine.action_name}
                      title="Verificar Parâmetros no Questor"
                    >
                      {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentRoutine.type === 'IMPORT' 
                    ? "Para Importação, informe o nome do arquivo de layout (ex: Layout.nli)."
                    : "Para Processos/Relatórios, informe o _AActionName. Use o botão ao lado para descobrir os parâmetros."}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Código Interno (Opcional)</Label>
                <div className="relative">
                  <Input 
                    value={currentRoutine.system_code || ''} 
                    onChange={(e) => setCurrentRoutine({...currentRoutine, system_code: e.target.value})}
                    placeholder="Ex: CONTABIL_IMPORT"
                    className="font-mono text-primary"
                  />
                  {currentRoutine.type === 'IMPORT' && currentRoutine.system_code !== 'CONTABIL_IMPORT' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full text-[10px] text-primary hover:text-primary/80"
                      onClick={() => setCurrentRoutine({...currentRoutine, system_code: 'CONTABIL_IMPORT'})}
                    >
                      Usar CONTABIL_IMPORT
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Para uso interno do sistema (e.g. CONTABIL_IMPORT).</p>
              </div>
            </div>

            {(currentRoutine.type === 'IMPORT' || currentRoutine.type === 'EXPORT') && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Conteúdo do Arquivo NLI</Label>
                    <div className="flex items-center gap-2">
                       <Input 
                         type="file" 
                         accept=".nli" 
                         className="hidden" 
                         id="nli-upload"
                         onChange={handleFileUpload}
                       />
                       <Label 
                         htmlFor="nli-upload" 
                         className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 py-1"
                       >
                         <Upload className="mr-2 h-3 w-3" />
                         Carregar Arquivo .nli
                       </Label>
                    </div>
                  </div>
                  <Textarea 
                    value={currentRoutine.layout_content || ''} 
                    onChange={(e) => setCurrentRoutine({...currentRoutine, layout_content: e.target.value})}
                    placeholder="O conteúdo do arquivo aparecerá aqui..."
                    className="font-mono text-xs h-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Você pode carregar o arquivo ou colar o conteúdo manualmente. O sistema converterá para Base64 automaticamente no envio.
                  </p>
                </div>
              )}

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={currentRoutine.description || ''} 
                onChange={(e) => setCurrentRoutine({...currentRoutine, description: e.target.value})}
                placeholder="Descrição opcional"
                className="h-20"
              />
            </div>
            
            <div className="space-y-2">
               <Label>Esquema de Parâmetros (JSON)</Label>
               <Textarea 
                 value={currentRoutine.parameters_schema || '{}'} 
                 onChange={(e) => setCurrentRoutine({...currentRoutine, parameters_schema: e.target.value})}
                 placeholder="{}"
                 className="font-mono text-xs h-20"
               />
               <p className="text-xs text-muted-foreground">Definição dos parâmetros esperados pela Action.</p>
            </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
             <Button onClick={handleSaveRoutine} disabled={isLoading}>
               {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
               Salvar
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
