'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { listarRegrasST, salvarRegraST, importarRegrasSTCsv, RegraFiscalST } from '@/app/actions/fiscal/regras-st';
import { Loader2, Search, Plus, Upload, FileText, Pencil, Trash2, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export function RegrasStManager() {
  const [loading, setLoading] = useState(false);
  const [regras, setRegras] = useState<RegraFiscalST[]>([]);
  const [busca, setBusca] = useState('');
  const [uf, setUf] = useState('PE');
  
  const [openModal, setOpenModal] = useState(false);
  const [currentRegra, setCurrentRegra] = useState<Partial<RegraFiscalST>>({ uf: 'PE' });

  const buscarRegras = async () => {
    setLoading(true);
    const res = await listarRegrasST(uf, busca);
    if (res.success) {
      setRegras(res.data || []);
    } else {
      toast.error(res.error);
    }
    setLoading(false);
  };

  const handleSalvar = async () => {
    if (!currentRegra.uf || !currentRegra.ncm_sh) {
      toast.error('UF e NCM/SH são obrigatórios.');
      return;
    }
    
    const res = await salvarRegraST(currentRegra as RegraFiscalST);
    if (res.success) {
      toast.success(res.message);
      setOpenModal(false);
      buscarRegras();
    } else {
      toast.error(res.error);
    }
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const res = await importarRegrasSTCsv(content);
      if (res.success) {
        toast.success(res.message);
        buscarRegras();
      } else {
        toast.error(res.error);
      }
      setLoading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Regras Fiscais ST</h2>
        <p className="text-muted-foreground text-sm">
          Gerencie o banco de dados de NCM/CEST e MVAs por Estado para o cálculo da Substituição Tributária.
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-2 max-w-xl">
              <Input 
                placeholder="Buscar por NCM, CEST ou Nome..." 
                value={busca} 
                onChange={e => setBusca(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscarRegras()}
              />
              <Input 
                placeholder="UF (ex: PE, SP)" 
                value={uf} 
                onChange={e => setUf(e.target.value.toUpperCase())}
                className="w-24"
                maxLength={2}
              />
              <Button onClick={buscarRegras} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleImportCsv} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 pointer-events-none">
                  <Upload className="h-4 w-4" /> Importar CSV
                </Button>
              </div>
              
              <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => setCurrentRegra({ uf: 'PE' })}>
                    <Plus className="h-4 w-4" /> Nova Regra
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{currentRegra.id ? 'Editar Regra ST' : 'Nova Regra ST'}</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2"><Label>UF</Label><Input value={currentRegra.uf || ''} onChange={e => setCurrentRegra({...currentRegra, uf: e.target.value.toUpperCase()})} maxLength={2} /></div>
                    <div className="space-y-2"><Label>NCM/SH</Label><Input value={currentRegra.ncm_sh || ''} onChange={e => setCurrentRegra({...currentRegra, ncm_sh: e.target.value})} /></div>
                    <div className="space-y-2"><Label>CEST</Label><Input value={currentRegra.cest || ''} onChange={e => setCurrentRegra({...currentRegra, cest: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Item</Label><Input type="number" value={currentRegra.item || ''} onChange={e => setCurrentRegra({...currentRegra, item: parseInt(e.target.value)})} /></div>
                    <div className="col-span-2 space-y-2"><Label>Nome Item</Label><Input value={currentRegra.nome_item || ''} onChange={e => setCurrentRegra({...currentRegra, nome_item: e.target.value})} /></div>
                    <div className="col-span-2 space-y-2"><Label>Descrição</Label><Input value={currentRegra.descricao || ''} onChange={e => setCurrentRegra({...currentRegra, descricao: e.target.value})} /></div>
                    <div className="space-y-2"><Label>MVA Original (%)</Label><Input type="number" step="0.01" value={currentRegra.mva_original || ''} onChange={e => setCurrentRegra({...currentRegra, mva_original: parseFloat(e.target.value)})} /></div>
                    <div className="space-y-2"><Label>MVA Ajustada 12% (%)</Label><Input type="number" step="0.01" value={currentRegra.mva_ajustada_int12 || ''} onChange={e => setCurrentRegra({...currentRegra, mva_ajustada_int12: parseFloat(e.target.value)})} /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenModal(false)}>Cancelar</Button>
                    <Button onClick={handleSalvar}>Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {regras.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <FileText className="h-12 w-12 opacity-20 mb-2" />
              <p>Nenhuma regra encontrada para os filtros aplicados.</p>
              <p className="text-sm">Clique em Buscar para listar todas ou importe um arquivo CSV.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-16">UF</TableHead>
                    <TableHead>NCM/SH</TableHead>
                    <TableHead>CEST</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">MVA Orig.</TableHead>
                    <TableHead className="w-20 text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regras.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-slate-600">{r.uf}</TableCell>
                      <TableCell className="font-mono text-xs bg-slate-100 px-2 py-1 rounded inline-block mt-2">{r.ncm_sh}</TableCell>
                      <TableCell className="font-mono text-xs">{r.cest}</TableCell>
                      <TableCell className="text-sm truncate max-w-[300px]" title={r.descricao || ''}>{r.descricao || r.nome_item}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">{r.mva_original ? `${r.mva_original}%` : '-'}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => { setCurrentRegra(r); setOpenModal(true); }}>
                          <Pencil className="h-4 w-4 text-slate-400 hover:text-indigo-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
