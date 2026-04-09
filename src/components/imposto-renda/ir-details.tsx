'use client';

import { useState, useRef, useEffect } from 'react';
import { IRDeclaration, updateIRStatus, addIRComment, registerIRReceipt, IRStatus, updateIRIndication, updateIRPriority, deleteIRReceipt, updateIRContributor, getCompanyForReceipt, saveIRReceiptPDF, IRFile, deleteIRFile } from '@/app/actions/imposto-renda';
import { getActiveUsersForSelect } from '@/app/actions/team';
import { getIRPartners } from '@/app/actions/ir-partners';
import { getCompaniesForSelect } from '@/app/actions/companies';
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
import { ChevronLeftIcon, PlayCircle, Clock, CheckCircle, Send, CheckCircle2, AlertTriangle, FileEdit, RotateCcw, Ban, Trash2, Download } from 'lucide-react';
import Link from 'next/link';
import { IRChat } from './ir-chat';
import { deleteIRDeclaration } from '@/app/actions/imposto-renda';
import { useRouter } from 'next/navigation';
import { IRTransmitidaDialog } from './ir-transmitida-dialog';

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
  files: IRFile[];
  isAdmin?: boolean;
}

export function IRDetails({ declaration, interactions, files, isAdmin }: IRDetailsProps) {
  const router = useRouter();
  const [comment, setComment] = useState<string>('');
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
    serviceValue: declaration.service_value ? declaration.service_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
  });
  const [priority, setPriority] = useState<'Baixa' | 'Média' | 'Alta' | 'Crítica'>(declaration.priority || 'Média');

  const [contributorDialog, setContributorDialog] = useState(false);
  const [contributorData, setContributorData] = useState({
    name: declaration.name || '',
    cpf: declaration.cpf || '',
    phone: declaration.phone || '',
    email: declaration.email || '',
    type: declaration.type || '',
    company_id: declaration.company_id || ''
  });
  const [companies, setCompanies] = useState<{id: string, razao_social: string}[]>([]);

  const [processadaDialog, setProcessadaDialog] = useState(false);
  const [transmitidaDialog, setTransmitidaDialog] = useState(false);
  const [processadaData, setProcessadaData] = useState({
    outcome_type: '' as 'restituicao' | 'imposto' | '',
    outcome_value: '',
    payment_method: '' as 'a_vista' | 'parcelado' | '',
    installments_count: '',
    installment_value: ''
  });

  const parseMoney = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return 0;
    return parseInt(numbers, 10) / 100;
  };

  const formatMoney = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleServiceValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseMoney(e.target.value);
    setIndicationData(prev => ({ ...prev, serviceValue: formatMoney(val) }));
  };

  const formatCpf = (s?: string) => {
    if (!s) return 'Não informado';
    const d = s.replace(/\D/g, '');
    if (d.length !== 11) return s;
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*$/, '$1.$2.$3-$4');
  };
  const formatDateSafe = (s?: string) => {
    if (!s) return '';
    try {
      const datePart = s.split('T')[0];
      const d = new Date(`${datePart}T12:00:00Z`);
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

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const comps = await getCompaniesForSelect();
        setCompanies(comps);
      } catch (e) {
        console.error("Failed to load companies", e);
      }
    };
    if (contributorDialog && companies.length === 0) {
      loadCompanies();
    }
  }, [contributorDialog]);

  const handleUpdateIndication = async () => {
    setLoading(true);
    try {
      await updateIRIndication(declaration.id, {
        indicated_by_user_id: indicationData.type === 'user' ? indicationData.userId : null,
        indicated_by_partner_id: indicationData.type === 'partner' ? indicationData.partnerId : null,
        service_value: indicationData.serviceValue ? parseFloat(indicationData.serviceValue.replace(/\./g, '').replace(',', '.')) : null
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
  
  const handleUpdateContributor = async () => {
    if (!contributorData.name || !contributorData.cpf || !contributorData.type) {
      toast.error('Nome, CPF e Tipo são obrigatórios');
      return;
    }

    const v = contributorData.cpf.replace(/\D/g, '');
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
      const payload = {
        ...contributorData,
        company_id: (!contributorData.company_id || contributorData.company_id === 'none' || contributorData.type !== 'Sócio') ? null : contributorData.company_id
      };
      await updateIRContributor(declaration.id, payload);
      toast.success('Dados do contribuinte atualizados');
      setContributorDialog(false);
    } catch {
      toast.error('Erro ao atualizar dados');
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
    
    if (newStatus === 'Processada') {
      setProcessadaDialog(true);
      return;
    }

    if (newStatus === 'Transmitida') {
      setTransmitidaDialog(true);
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

  const submitProcessada = async () => {
    if (!processadaData.outcome_type) {
      toast.error('Informe se houve restituição ou imposto a pagar');
      return;
    }
    
    if (!processadaData.outcome_value) {
      toast.error('O valor é obrigatório');
      return;
    }
    
    const outcomeValueNum = parseFloat(processadaData.outcome_value.replace(/\./g, '').replace(',', '.'));
    if (isNaN(outcomeValueNum) || outcomeValueNum <= 0) {
      toast.error('Valor inválido');
      return;
    }

    if (processadaData.outcome_type === 'imposto') {
      if (!processadaData.payment_method) {
        toast.error('Informe se foi à vista ou parcelado');
        return;
      }
      
      if (processadaData.payment_method === 'parcelado' && (!processadaData.installments_count || parseInt(processadaData.installments_count) <= 0)) {
        toast.error('Informe uma quantidade válida de parcelas');
        return;
      }
    }

    setLoading(true);
    try {
      const dataToSave = {
        outcome_type: processadaData.outcome_type,
        outcome_value: outcomeValueNum,
        payment_method: processadaData.outcome_type === 'imposto' ? processadaData.payment_method : null,
        installments_count: (processadaData.outcome_type === 'imposto' && processadaData.payment_method === 'parcelado') ? parseInt(processadaData.installments_count) : null,
        installment_value: (processadaData.outcome_type === 'imposto' && processadaData.payment_method === 'parcelado') ? outcomeValueNum / parseInt(processadaData.installments_count) : null
      };

      await updateIRStatus(declaration.id, 'Processada', undefined, dataToSave);
      toast.success('Status alterado para Processada com sucesso');
      setProcessadaDialog(false);
      setProcessadaData({
        outcome_type: '',
        outcome_value: '',
        payment_method: '',
        installments_count: '',
        installment_value: ''
      });
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
          {isAdmin && (
            <Button variant="destructive" size="sm" className="gap-2" onClick={async () => {
              if (confirm('Tem certeza que deseja excluir esta declaração? Esta ação não pode ser desfeita.')) {
                try {
                  setLoading(true);
                  await deleteIRDeclaration(declaration.id);
                  toast.success('Declaração excluída com sucesso');
                  window.location.href = '/admin/pessoa-fisica/imposto-renda';
                } catch (e: any) {
                  toast.error(e?.message || 'Erro ao excluir declaração');
                } finally {
                  setLoading(false);
                }
              }
            }} disabled={loading}>
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Excluir</span>
            </Button>
          )}
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
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Dados do Contribuinte</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setContributorDialog(true)} disabled={loading} className="h-8 w-8">
                <FileEdit className="h-4 w-4" />
              </Button>
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
                  <p className="text-sm">CPF: {formatCpf(declaration.cpf)}</p>
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

          {/* ARQUIVOS ANEXADOS CARD */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <PaperClipIcon className="h-5 w-5" />
                Arquivos Anexados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4 italic">
                  Nenhum arquivo anexado
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                      <div className="overflow-hidden pr-2">
                        <p className="text-sm font-medium truncate" title={f.file_name}>{f.file_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(f.created_at), "dd/MM/yyyy HH:mm")} • {f.uploaded_by_name || 'Sistema'}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                            onClick={() => window.open(f.file_url, '_blank')}
                            title="Baixar/Visualizar"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-100 hover:text-red-700"
                            onClick={async () => {
                              if (confirm('Tem certeza que deseja remover este arquivo?')) {
                                try {
                                  setLoading(true);
                                  await deleteIRFile(f.id, declaration.id);
                                  toast.success('Arquivo removido com sucesso');
                                } catch (e) {
                                  toast.error('Erro ao remover arquivo');
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                            title="Remover"
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
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
                  const company = await getCompanyForReceipt(receiptCompany);
                  if (!company) throw new Error('Empresa não encontrada');
                  
                  const { default: jsPDF } = await import('jspdf');
                  const doc = new jsPDF();
                  const fmtMoney = (n?: number | null) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n ?? 0);
                  const fmtCpf = (s?: string) => {
                    if (!s) return '';
                    const d = String(s).replace(/\D/g, '');
                    if (d.length !== 11) return s;
                    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                  };
                  const fmtDate = (s: string) => {
                    try {
                      const datePart = s.split('T')[0];
                      const d = new Date(`${datePart}T12:00:00Z`);
                      const day = d.getUTCDate().toString().padStart(2, '0');
                      const month = (d.getUTCMonth()+1).toString().padStart(2, '0');
                      const year = d.getUTCFullYear();
                      return `${day}/${month}/${year}`;
                    } catch { return s; }
                  };
                  
                  const addressParts = [
                    company.address_type, company.address_street, company.address_number, company.address_complement
                  ].filter(Boolean).join(' ');
                  const cityLine = [company.address_neighborhood, company.municipio, company.uf, company.address_zip_code].filter(Boolean).join(' - ');
                  
                  doc.setFontSize(16);
                  doc.text(company.razao_social || company.nome || receiptCompany, 105, 20, { align: 'center' });
                  doc.setFontSize(12);
                  doc.text(`CNPJ: ${company.cnpj || ''}`, 105, 28, { align: 'center' });
                  doc.text(addressParts, 105, 36, { align: 'center' });
                  if (cityLine) doc.text(cityLine, 105, 44, { align: 'center' });
                  doc.line(20, 50, 190, 50);
                  doc.setFontSize(14);
                  doc.text('RECIBO DE PAGAMENTO', 105, 62, { align: 'center' });
                  doc.setFontSize(12);
                  
                  const lines = [
                    `Recebemos de: ${declaration.name} (CPF ${fmtCpf(declaration.cpf || '')})`,
                    `Referente à: Serviços de Declaração de Imposto de Renda - Exercício ${declaration.year}`,
                    `Forma de Pagamento: ${declaration.receipt_method || ''} | Conta: ${declaration.receipt_account || ''}`,
                    `Data do Recebimento: ${fmtDate(declaration.receipt_date || '')}`,
                    `Valor: ${fmtMoney(declaration.service_value)}`
                  ];
                  let y = 78;
                  for (const ln of lines) {
                    doc.text(ln, 20, y);
                    y += 8;
                  }
                  doc.line(20, y + 6, 190, y + 6);
                  doc.text('Assinatura:', 20, y + 18);
                  doc.line(45, y + 18, 120, y + 18);
                  
                  const base64Pdf = doc.output('datauristring');
                  const fileName = `recibo_${declaration.year}.pdf`;
                  
                  const res = await saveIRReceiptPDF(declaration.id, base64Pdf, receiptCompany, fileName);
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
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={indicationData.serviceValue}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const digits = raw.replace(/\D/g, '');
                    if (!digits) {
                      setIndicationData(prev => ({ ...prev, serviceValue: '' }));
                      return;
                    }
                    const int = digits.slice(0, Math.max(0, digits.length - 2));
                    const dec = digits.slice(Math.max(0, digits.length - 2)).padStart(2, '0');
                    const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    setIndicationData(prev => ({ ...prev, serviceValue: `${intFmt || '0'},${dec}` }));
                  }}
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
      
      <Dialog open={contributorDialog} onOpenChange={setContributorDialog}>
        <DialogContent className="sm:max-w-[420px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Contribuinte</DialogTitle>
            <DialogDescription>
              Atualize os dados do contribuinte.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input 
                value={contributorData.name}
                onChange={(e) => setContributorData({ ...contributorData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input 
                value={contributorData.cpf}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 11);
                  let m = d;
                  if (d.length > 9) m = d.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, '$1.$2.$3-$4');
                  else if (d.length > 6) m = d.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, '$1.$2.$3');
                  else if (d.length > 3) m = d.replace(/^(\d{3})(\d{0,3}).*/, '$1.$2');
                  setContributorData({ ...contributorData, cpf: m });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone (WhatsApp)</Label>
              <Input 
                value={contributorData.phone}
                onChange={(e) => setContributorData({ ...contributorData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input 
                type="email"
                value={contributorData.email}
                onChange={(e) => setContributorData({ ...contributorData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Cliente</Label>
              <Select 
                value={contributorData.type} 
                onValueChange={(v) => setContributorData({ ...contributorData, type: v, company_id: v !== 'Sócio' ? '' : contributorData.company_id })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Particular">Particular</SelectItem>
                  <SelectItem value="Sócio">Sócio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {contributorData.type === 'Sócio' && (
              <div className="space-y-2">
                <Label>Empresa (Opcional)</Label>
                <Select 
                  value={contributorData.company_id} 
                  onValueChange={(v) => setContributorData({ ...contributorData, company_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContributorDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateContributor} disabled={loading}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Processada */}
      <Dialog open={processadaDialog} onOpenChange={setProcessadaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status para Processada</DialogTitle>
            <DialogDescription>
              Informe os dados do resultado da declaração.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Resultado da Declaração</Label>
              <Select
                value={processadaData.outcome_type}
                onValueChange={(value: 'restituicao' | 'imposto') => setProcessadaData({
                  ...processadaData,
                  outcome_type: value,
                  payment_method: '',
                  installments_count: '',
                  installment_value: ''
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restituicao">Restituição</SelectItem>
                  <SelectItem value="imposto">Imposto a Pagar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {processadaData.outcome_type && (
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={processadaData.outcome_value}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const digits = raw.replace(/\D/g, '');
                    if (!digits) {
                      setProcessadaData({ ...processadaData, outcome_value: '' });
                      return;
                    }
                    const int = digits.slice(0, Math.max(0, digits.length - 2));
                    const dec = digits.slice(Math.max(0, digits.length - 2)).padStart(2, '0');
                    const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    setProcessadaData({ ...processadaData, outcome_value: `${intFmt || '0'},${dec}` });
                  }}
                />
              </div>
            )}

            {processadaData.outcome_type === 'imposto' && (
              <>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select
                    value={processadaData.payment_method}
                    onValueChange={(value: 'a_vista' | 'parcelado') => setProcessadaData({
                      ...processadaData,
                      payment_method: value,
                      installments_count: '',
                      installment_value: ''
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a forma de pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a_vista">À Vista</SelectItem>
                      <SelectItem value="parcelado">Parcelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {processadaData.payment_method === 'parcelado' && (
                  <div className="space-y-2">
                    <Label>Quantidade de Parcelas</Label>
                    <Input
                      type="number"
                      min="1"
                      max="8"
                      placeholder="Ex: 8"
                      value={processadaData.installments_count}
                      onChange={(e) => {
                        const count = e.target.value;
                        setProcessadaData({ ...processadaData, installments_count: count });
                      }}
                    />
                    {processadaData.outcome_value && processadaData.installments_count && parseInt(processadaData.installments_count) > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Valor da Parcela: R$ {(parseFloat(processadaData.outcome_value.replace(/\./g, '').replace(',', '.')) / parseInt(processadaData.installments_count)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessadaDialog(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={submitProcessada} disabled={loading}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <IRTransmitidaDialog
        open={transmitidaDialog}
        onOpenChange={setTransmitidaDialog}
        declaration={declaration}
        onSuccess={() => {
          // You could re-fetch data or just let revalidatePath handle it via server actions
          // The page will automatically refresh because of revalidatePath
        }}
      />
    </div>
  );
}
