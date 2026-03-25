'use client';

import { useState, useRef, useEffect } from 'react';
import { IRDeclaration, updateIRStatus, addIRComment, registerIRReceipt, IRStatus, updateIRIndication, updateIRPriority, updateIRCpf, deleteIRReceipt, generateIRReceiptPDF } from '@/app/actions/imposto-renda';
import { getActiveUsersForSelect } from '@/app/actions/team';
import { getIRPartners } from '@/app/actions/ir-partners';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserCircleIcon, BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, CheckCircleIcon, BanknotesIcon, PaperClipIcon, CurrencyDollarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon, PlayCircle, Clock, CheckCircle, Send, CheckCircle2, AlertTriangle, FileEdit, RotateCcw, Ban } from 'lucide-react';
import Link from 'next/link';
import { IRChat } from './ir-chat';

const STATUS_COLORS: Record<string, string> = {
  'Não Iniciado': 'bg-slate-500',
  'Iniciado': 'bg-blue-900',
  'Pendente': 'bg-red-600',
  'Validada': 'bg-yellow-500',
  'Transmitida': 'bg-orange-500',
  'Processada': 'bg-green-600',
  'Malha Fina': 'bg-pink-600',
  'Retificadora': 'bg-purple-600',
  'Reaberta': 'bg-blue-400',
  'Cancelada': 'bg-slate-900'
};

interface IRDetailsProps {
  declaration: IRDeclaration;
  interactions: any[];
}

export function IRDetails({ declaration, interactions }: IRDetailsProps) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [justificationDialog, setJustificationDialog] = useState<{isOpen: boolean, targetStatus: IRStatus | null}>({ isOpen: false, targetStatus: null });
  const [justification, setJustification] = useState('');

  const [receiptDialog, setReceiptDialog] = useState(false);
  const [receiptToolsDialog, setReceiptToolsDialog] = useState(false);
  const [receiptCompany, setReceiptCompany] = useState<'NZD CONTABILIDADE' | 'NZD CONSULTORIA' | ''>('');
  const [receiptData, setReceiptData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    method: '',
    account: '',
    attachment: null as File | null,
    attachmentName: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [indicationDialog, setIndicationDialog] = useState(false);
  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  const [partners, setPartners] = useState<{id: string, name: string}[]>([]);
  const [indicationData, setIndicationData] = useState({
    type: declaration.indicated_by_user_id ? 'user' : (declaration.indicated_by_partner_id ? 'partner' : 'none'),
    userId: declaration.indicated_by_user_id || '',
    partnerId: declaration.indicated_by_partner_id || '',
    serviceValue: declaration.service_value ? declaration.service_value.toString() : ''
  });
  const [priority, setPriority] = useState<'Baixa' | 'Média' | 'Alta' | 'Crítica'>(declaration.priority || 'Média');
  const [cpfDialog, setCpfDialog] = useState(false);
  const [cpfInput, setCpfInput] = useState<string>(declaration.cpf || '');
  const formatCpf = (s?: string) => {
    if (!s) return 'Não informado';
    const d = s.replace(/\D/g, '');
    if (d.length !== 11) return s;
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*$/, '$1.$2.$3-$4');
  };
  const formatDateSafe = (s?: string) => {
    if (!s) return '';
    try {
      const d = new Date(`${s}T12:00:00Z`);
      return format(d, 'dd/MM/yyyy');
    } catch {
      return s;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, partnersData] = await Promise.all([
          getActiveUsersForSelect(),
          getIRPartners()
        ]);
        setUsers(usersData);
        setPartners(partnersData);
      } catch (e) {
        console.error("Failed to load indication options", e);
      }
    };
    if (indicationDialog && users.length === 0) {
      loadData();
    }
  }, [indicationDialog]);

  const handleUpdateIndication = async () => {
    setLoading(true);
    try {
      await updateIRIndication(declaration.id, {
        indicated_by_user_id: indicationData.type === 'user' ? indicationData.userId : null,
        indicated_by_partner_id: indicationData.type === 'partner' ? indicationData.partnerId : null,
        service_value: indicationData.serviceValue ? parseFloat(indicationData.serviceValue.replace(',', '.')) : null
      });
      toast.success('Indicação e Valores atualizados');
      setIndicationDialog(false);
    } catch (error) {
      toast.error('Erro ao atualizar indicação');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePriority = async (newPriority: 'Baixa' | 'Média' | 'Alta' | 'Crítica') => {
    setLoading(true);
    try {
      await updateIRPriority(declaration.id, newPriority);
      setPriority(newPriority);
      toast.success('Prioridade atualizada');
    } catch {
      toast.error('Erro ao atualizar prioridade');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateCpf = async () => {
    const v = cpfInput.replace(/\D/g, '');
    if (v.length !== 11 || /^(\d)\1{10}$/.test(v)) {
      toast.error('CPF inválido');
      return;
    }
    const calc = (base: number) => {
      let sum = 0;
      for (let i = 0; i < base; i++) sum += parseInt(v[i]) * (base + 1 - i);
      const r = (sum * 10) % 11;
      return r === 10 ? 0 : r;
    };
    if (calc(9) !== parseInt(v[9]) || calc(10) !== parseInt(v[10])) {
      toast.error('CPF inválido');
      return;
    }
    setLoading(true);
    try {
      await updateIRCpf(declaration.id, cpfInput);
      toast.success('CPF atualizado');
      setCpfDialog(false);
    } catch {
      toast.error('Erro ao atualizar CPF');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setLoading(true);
    try {
      await addIRComment(declaration.id, comment);
      setComment('');
      toast.success('Comentário adicionado');
    } catch (error) {
      toast.error('Erro ao adicionar comentário');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: IRStatus, requireJustification: boolean = false) => {
    if (requireJustification) {
      setJustificationDialog({ isOpen: true, targetStatus: newStatus });
      return;
    }

    setLoading(true);
    try {
      await updateIRStatus(declaration.id, newStatus);
      toast.success(`Status alterado para ${newStatus}`);
    } catch (error) {
      toast.error('Erro ao alterar status');
    } finally {
      setLoading(false);
    }
  };

  const submitJustification = async () => {
    if (!justification.trim() || !justificationDialog.targetStatus) {
      toast.error('A justificativa é obrigatória');
      return;
    }

    setLoading(true);
    try {
      await updateIRStatus(declaration.id, justificationDialog.targetStatus, justification);
      toast.success(`Status alterado para ${justificationDialog.targetStatus}`);
      setJustificationDialog({ isOpen: false, targetStatus: null });
      setJustification('');
    } catch (error) {
      toast.error('Erro ao alterar status');
    } finally {
      setLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!receiptData.method || !receiptData.account || !receiptData.date) {
      toast.error('Data, forma de pagamento e conta são obrigatórios');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('receipt_date', receiptData.date);
      formData.append('receipt_method', receiptData.method);
      formData.append('receipt_account', receiptData.account);
      if (receiptData.attachment) {
        formData.append('attachment', receiptData.attachment);
      }

      await registerIRReceipt(declaration.id, formData);
      toast.success('Pagamento registrado com sucesso!');
      setReceiptDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('O arquivo não pode exceder 5MB');
      return;
    }

    setReceiptData(prev => ({ ...prev, attachment: file, attachmentName: file.name }));
  };

  // Status buttons visibility logic
  const getAllActions = () => {
    const status = declaration.status;
    const actions: { label: string, target: IRStatus, justify: boolean, icon: any, disabled: boolean }[] = [
      { label: 'Iniciar', target: 'Iniciado', justify: false, icon: PlayCircle, disabled: true },
      { label: 'Pendente', target: 'Pendente', justify: true, icon: Clock, disabled: true },
      { label: 'Validada', target: 'Validada', justify: false, icon: CheckCircle, disabled: true },
      { label: 'Transmitida', target: 'Transmitida', justify: false, icon: Send, disabled: true },
      { label: 'Processada', target: 'Processada', justify: false, icon: CheckCircle2, disabled: true },
      { label: 'Malha Fina', target: 'Malha Fina', justify: false, icon: AlertTriangle, disabled: true },
      { label: 'Retificadora', target: 'Retificadora', justify: false, icon: FileEdit, disabled: true },
      { label: 'Reabrir', target: 'Reaberta', justify: false, icon: RotateCcw, disabled: true },
      { label: 'Cancelar', target: 'Cancelada', justify: true, icon: Ban, disabled: true },
    ];

    if (status === 'Não Iniciado') {
      actions.find(a => a.label === 'Iniciar')!.disabled = false;
      actions.find(a => a.label === 'Cancelar')!.disabled = false;
    } else if (status === 'Iniciado' || status === 'Reaberta') {
      actions.find(a => a.label === 'Validada')!.disabled = false;
      actions.find(a => a.label === 'Pendente')!.disabled = false;
      actions.find(a => a.label === 'Cancelar')!.disabled = false;
    } else if (status === 'Pendente') {
      actions.find(a => a.label === 'Validada')!.disabled = false;
      actions.find(a => a.label === 'Cancelar')!.disabled = false;
    } else if (status === 'Validada') {
      actions.find(a => a.label === 'Transmitida')!.disabled = false;
      actions.find(a => a.label === 'Pendente')!.disabled = false;
      actions.find(a => a.label === 'Cancelar')!.disabled = false;
    } else if (status === 'Transmitida') {
      actions.find(a => a.label === 'Processada')!.disabled = false;
      actions.find(a => a.label === 'Malha Fina')!.disabled = false;
      actions.find(a => a.label === 'Retificadora')!.disabled = false;
    } else if (status === 'Processada' || status === 'Malha Fina') {
      actions.find(a => a.label === 'Retificadora')!.disabled = false;
    } else if (status === 'Retificadora') {
      actions.find(a => a.label === 'Transmitida')!.disabled = false;
      actions.find(a => a.label === 'Processada')!.disabled = false;
      actions.find(a => a.label === 'Malha Fina')!.disabled = false;
      actions.find(a => a.label === 'Retificadora')!.disabled = false;
    } else if (status === 'Cancelada') {
      actions.find(a => a.label === 'Reabrir')!.disabled = false;
    }

    return actions;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/admin/pessoa-fisica/imposto-renda">
            <Button variant="ghost" size="icon">
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Detalhes da Declaração</h2>
            <p className="text-muted-foreground text-sm">Exercício {declaration.year}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`text-sm px-3 py-1 ${STATUS_COLORS[declaration.status] || 'bg-gray-500'} hover:${STATUS_COLORS[declaration.status]} text-white`}>
            {declaration.status}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Prioridade:</span>
            <Select value={priority} onValueChange={(v: any) => handleUpdatePriority(v)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Definir..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Baixa">Baixa</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Crítica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {declaration.is_received ? (
            <Badge variant="outline" className="text-green-600 border-green-600 px-3 py-1 flex items-center gap-1">
              <CheckCircleIcon className="h-4 w-4" /> Recebido
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-600 border-red-600 px-3 py-1 flex items-center gap-1">
              <BanknotesIcon className="h-4 w-4" /> A Receber
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda - Dados e Ações */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Dados do Contribuinte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <UserCircleIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{declaration.name}</p>
                  <p className="text-xs text-muted-foreground">Tipo: {declaration.type}</p>
                </div>
              </div>

              {declaration.type === 'Sócio' && declaration.company_name && (
                <div className="flex items-start gap-3">
                  <BuildingOfficeIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{declaration.company_name}</p>
                    <p className="text-xs text-muted-foreground">CNPJ: {declaration.company_cnpj}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <PhoneIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <p className="text-sm">{declaration.phone || 'Não informado'}</p>
              </div>

              <div className="flex items-start gap-3">
                <UserCircleIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex items-center gap-2">
                  <p className="text-sm">CPF: {declaration.cpf || 'Não informado'}</p>
                  <p className="text-sm">CPF: {formatCpf(declaration.cpf)}</p>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setCpfDialog(true)}>
                    Editar
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <EnvelopeIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <p className="text-sm break-all">{declaration.email || 'Não informado'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Indicação e Valores</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIndicationDialog(true)} disabled={loading} className="h-8 w-8">
                <FileEdit className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {!(declaration.indicated_by_user_name || declaration.indicated_by_partner_name) && !declaration.service_value && (
                <div className="text-sm text-muted-foreground italic text-center py-2">
                  Nenhuma indicação ou valor informado.
                </div>
              )}
              
              {(declaration.indicated_by_user_name || declaration.indicated_by_partner_name) && (
                <div className="flex items-start gap-3">
                  <UserGroupIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Indicado por:</p>
                    <p className="text-sm text-muted-foreground">
                      {declaration.indicated_by_user_name ? `${declaration.indicated_by_user_name} (Usuário)` : `${declaration.indicated_by_partner_name} (Parceiro)`}
                    </p>
                    {((declaration.user_commission_percent && declaration.indicated_by_user_name) || (declaration.partner_commission_percent && declaration.indicated_by_partner_name)) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Comissão: {declaration.indicated_by_user_name ? declaration.user_commission_percent : declaration.partner_commission_percent}%
                      </p>
                    )}
                  </div>
                </div>
              )}
              {declaration.service_value && (
                <div className="flex items-start gap-3">
                  <CurrencyDollarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Valor do Serviço:</p>
                    <p className="text-sm text-muted-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(declaration.service_value)}
                    </p>
                    {((declaration.user_commission_percent && declaration.indicated_by_user_name) || (declaration.partner_commission_percent && declaration.indicated_by_partner_name)) && declaration.service_value ? (
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">
                        Valor da Premiação: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(declaration.service_value * ((declaration.indicated_by_user_name ? (declaration.user_commission_percent || 0) : (declaration.partner_commission_percent || 0)) / 100))}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {declaration.is_received && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Dados de Recebimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <BanknotesIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Forma de Pagamento:</p>
                    <p className="text-sm text-muted-foreground">{declaration.receipt_method}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BuildingOfficeIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Conta:</p>
                    <p className="text-sm text-muted-foreground">{declaration.receipt_account}</p>
                  </div>
                </div>
                {declaration.receipt_date && (
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Data do Recebimento:</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateSafe(declaration.receipt_date)}
                      </p>
                    </div>
                  </div>
                )}
                {declaration.receipt_attachment_url && (
                  <div className="pt-2">
                    <a 
                      href={declaration.receipt_attachment_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <PaperClipIcon className="h-4 w-4" /> Ver Comprovante
                    </a>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="destructive" 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await deleteIRReceipt(declaration.id);
                        toast.success('Recebimento excluído');
                      } catch {
                        toast.error('Erro ao excluir recebimento');
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    Excluir Recebimento
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setReceiptToolsDialog(true)}
                  >
                    Gerar Recibo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Controle de Status</CardTitle>
              <CardDescription>Ações disponíveis para o fluxo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {getAllActions().map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <Button 
                      key={idx} 
                      onClick={() => handleStatusChange(action.target, action.justify)} 
                      disabled={loading || action.disabled} 
                      className={`flex items-center justify-center gap-1.5 h-10 px-2 transition-all ${
                        action.disabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-muted'
                      }`}
                      variant="outline"
                      title={action.label}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-xs truncate">{action.label}</span>
                    </Button>
                  );
                })}
              </div>

              {!declaration.is_received && (
                <div className="pt-4 mt-4 border-t">
                  <Button onClick={() => setReceiptDialog(true)} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                    <BanknotesIcon className="h-5 w-5 mr-2" /> Registrar Recebimento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita - Histórico e Comentários */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="flex flex-col h-full min-h-[600px]">
            <CardHeader className="pb-4 border-b">
              <CardTitle>Histórico e Comentários</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <IRChat 
                declarationId={declaration.id} 
                interactions={interactions} 
                status={declaration.status} 
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Justificativa */}
      <Dialog open={justificationDialog.isOpen} onOpenChange={(open) => !open && setJustificationDialog({ isOpen: false, targetStatus: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justificativa Necessária</DialogTitle>
            <DialogDescription>
              Para alterar o status para <strong className="text-foreground">{justificationDialog.targetStatus}</strong>, é necessário informar o motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="justification">Motivo / Justificativa</Label>
            <Textarea 
              id="justification"
              placeholder="Descreva detalhadamente o motivo desta alteração..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJustificationDialog({ isOpen: false, targetStatus: null })}>
              Cancelar
            </Button>
            <Button onClick={submitJustification} disabled={loading || !justification.trim()}>
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Recebimento */}
      <Dialog open={receiptDialog} onOpenChange={setReceiptDialog}>
        <DialogContent className="sm:max-w-[560px] w-[560px]">
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
            <DialogDescription>
              Informe os dados do pagamento recebido.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="receipt_date">Data do Recebimento</Label>
              <Input 
                id="receipt_date" 
                type="date" 
                value={receiptData.date}
                onChange={e => setReceiptData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={receiptData.method} onValueChange={v => setReceiptData(prev => ({ ...prev, method: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="Débito">Débito</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conta de Recebimento</Label>
              <Select value={receiptData.account} onValueChange={v => setReceiptData(prev => ({ ...prev, account: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Itaú">Itaú</SelectItem>
                  <SelectItem value="CEF">CEF</SelectItem>
                  <SelectItem value="Cora">Cora</SelectItem>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Asaas">Asaas</SelectItem>
                  <SelectItem value="Carteira">Carteira</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Comprovante (Opcional)</Label>
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <PaperClipIcon className="w-4 h-4 mr-2" />
                  {receiptData.attachmentName ? receiptData.attachmentName : 'Anexar PDF ou Imagem'}
                </Button>
                {receiptData.attachmentName && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="text-red-500 px-2"
                    onClick={() => setReceiptData(prev => ({ ...prev, attachment: null, attachmentName: '' }))}
                  >
                    X
                  </Button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReceive} disabled={loading || !receiptData.method || !receiptData.account || !receiptData.date}>
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Recibo */}
      <Dialog open={receiptToolsDialog} onOpenChange={setReceiptToolsDialog}>
        <DialogContent className="sm:max-w-[520px] w-[520px]">
          <DialogHeader>
            <DialogTitle>Gerar Recibo</DialogTitle>
            <DialogDescription>
              Escolha a empresa emissora para gerar o PDF do recibo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Empresa emissora</Label>
            <Select value={receiptCompany} onValueChange={(v: any) => setReceiptCompany(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NZD CONTABILIDADE">NZD CONTABILIDADE</SelectItem>
                <SelectItem value="NZD CONSULTORIA">NZD CONSULTORIA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptToolsDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={async () => {
                if (!receiptCompany) {
                  toast.error('Selecione a empresa emissora');
                  return;
                }
                setLoading(true);
                try {
                  const res = await generateIRReceiptPDF(declaration.id, receiptCompany as any);
                  if (res?.url) {
                    window.open(res.url, '_blank');
                  }
                  toast.success('Recibo gerado');
                  setReceiptToolsDialog(false);
                } catch (e: any) {
                  toast.error(e?.message || 'Erro ao gerar recibo');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !receiptCompany}
            >
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Indicação e Valores */}
      <Dialog open={indicationDialog} onOpenChange={setIndicationDialog}>
        <DialogContent className="sm:max-w-[640px] w-[640px]">
          <DialogHeader>
            <DialogTitle>Indicação e Valores</DialogTitle>
            <DialogDescription>
              Informe o valor do serviço e a indicação para cálculo de premiação.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-base">Valor do Serviço (R$)</Label>
              <Input 
                className="h-11 text-base"
                placeholder="0,00"
                value={indicationData.serviceValue}
                onChange={(e) => setIndicationData(prev => ({ ...prev, serviceValue: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base">Tipo de Indicação</Label>
              <Select 
                value={indicationData.type} 
                onValueChange={(v) => setIndicationData(prev => ({ ...prev, type: v, userId: '', partnerId: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma / Sem Indicação</SelectItem>
                  <SelectItem value="user">Usuário do Escritório</SelectItem>
                  <SelectItem value="partner">Parceiro Externo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {indicationData.type === 'user' && (
              <div className="space-y-2">
                <Label className="text-base">Usuário</Label>
                <Select 
                  value={indicationData.userId} 
                  onValueChange={(v) => setIndicationData(prev => ({ ...prev, userId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {indicationData.type === 'partner' && (
              <div className="space-y-2">
                <Label className="text-base">Parceiro</Label>
                <Select 
                  value={indicationData.partnerId} 
                  onValueChange={(v) => setIndicationData(prev => ({ ...prev, partnerId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o parceiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIndicationDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateIndication} disabled={loading || (indicationData.type === 'user' && !indicationData.userId) || (indicationData.type === 'partner' && !indicationData.partnerId)}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={cpfDialog} onOpenChange={setCpfDialog}>
        <DialogContent className="sm:max-w-[420px] w-[420px]">
          <DialogHeader>
            <DialogTitle>Editar CPF</DialogTitle>
            <DialogDescription>
              Atualize o CPF do contribuinte.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="cpf_edit">CPF</Label>
            <Input 
              id="cpf_edit" 
              value={cpfInput}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, '').slice(0, 11);
                let m = d;
                if (d.length > 9) m = d.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, '$1.$2.$3-$4');
                else if (d.length > 6) m = d.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, '$1.$2.$3');
                else if (d.length > 3) m = d.replace(/^(\d{3})(\d{0,3}).*/, '$1.$2');
                setCpfInput(m);
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCpfDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCpf} disabled={loading}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
