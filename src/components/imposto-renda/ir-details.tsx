'use client';

import { useState, useRef, useEffect } from 'react';
import { IRDeclaration, updateIRStatus, addIRComment, registerIRReceipt, IRStatus, updateIRIndication } from '@/app/actions/imposto-renda';
import { getTeamUsers } from '@/app/actions/team';
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
import { ChevronLeftIcon } from 'lucide-react';
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, partnersData] = await Promise.all([
          getTeamUsers(),
          getIRPartners()
        ]);
        setUsers(usersData.filter(u => u.is_active));
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
    const actions: { label: string, target: IRStatus, justify: boolean, color: string, disabled: boolean }[] = [
      { label: 'Iniciar', target: 'Iniciado', justify: false, color: 'bg-blue-900', disabled: true },
      { label: 'Pendente', target: 'Pendente', justify: true, color: 'bg-red-600', disabled: true },
      { label: 'Validada', target: 'Validada', justify: false, color: 'bg-yellow-500', disabled: true },
      { label: 'Transmitida', target: 'Transmitida', justify: false, color: 'bg-orange-500', disabled: true },
      { label: 'Processada', target: 'Processada', justify: false, color: 'bg-green-600', disabled: true },
      { label: 'Malha Fina', target: 'Malha Fina', justify: false, color: 'bg-pink-600', disabled: true },
      { label: 'Retificadora', target: 'Retificadora', justify: false, color: 'bg-purple-600', disabled: true },
      { label: 'Reabrir', target: 'Reaberta', justify: false, color: 'bg-blue-400', disabled: true },
      { label: 'Cancelar', target: 'Cancelada', justify: true, color: 'bg-slate-900', disabled: true },
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
                <EnvelopeIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <p className="text-sm break-all">{declaration.email || 'Não informado'}</p>
              </div>
            </CardContent>
          </Card>

          {(declaration.indicated_by_user_name || declaration.indicated_by_partner_name || declaration.service_value) && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Indicação e Valores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
          )}

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
                        {format(new Date(declaration.receipt_date + 'T12:00:00'), 'dd/MM/yyyy')}
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
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Controle de Status</CardTitle>
              <CardDescription>Ações disponíveis para o fluxo</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {getAllActions().map((action, idx) => (
                <Button 
                  key={idx} 
                  onClick={() => handleStatusChange(action.target, action.justify)} 
                  disabled={loading || action.disabled} 
                  className={`w-full justify-start border shadow-sm transition-all ${action.color} text-white ${
                    action.disabled 
                      ? 'opacity-40 cursor-not-allowed saturate-50' 
                      : 'hover:brightness-110 hover:shadow-md'
                  }`}
                  variant="default"
                >
                  {action.label}
                </Button>
              ))}

              {!declaration.is_received && (
                <div className="pt-4 mt-2 border-t">
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
        <DialogContent className="sm:max-w-[425px]">
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
    </div>
  );
}
