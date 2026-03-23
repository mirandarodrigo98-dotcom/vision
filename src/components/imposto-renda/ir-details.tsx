'use client';

import { useState } from 'react';
import { IRDeclaration, updateIRStatus, addIRComment, markIRAsReceived, IRStatus } from '@/app/actions/imposto-renda';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserCircleIcon, BuildingOfficeIcon, PhoneIcon, EnvelopeIcon, CheckCircleIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { ChevronLeftIcon } from 'lucide-react';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  'Não Iniciado': 'bg-slate-500',
  'Em andamento': 'bg-blue-500',
  'Pendente': 'bg-yellow-500',
  'Em Validação': 'bg-purple-500',
  'Cancelado': 'bg-red-500',
  'Transmitido': 'bg-green-500',
  'Processado': 'bg-emerald-500',
  'Malha Fina': 'bg-orange-500'
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
    setLoading(true);
    try {
      await markIRAsReceived(declaration.id);
      toast.success('Pagamento registrado com sucesso!');
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
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
          <Badge className={`text-sm px-3 py-1 ${STATUS_COLORS[declaration.status] || 'bg-gray-500'}`}>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna Esquerda - Dados e Ações */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Controle de Status</CardTitle>
              <CardDescription>Ações disponíveis para o fluxo da declaração</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {declaration.status === 'Não Iniciado' && (
                <Button onClick={() => handleStatusChange('Em andamento')} disabled={loading} className="w-full justify-start" variant="outline">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span> Iniciar (Em Andamento)
                </Button>
              )}
              
              <Button onClick={() => handleStatusChange('Pendente', true)} disabled={loading} className="w-full justify-start" variant="outline">
                <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span> Marcar como Pendente
              </Button>
              
              <Button onClick={() => handleStatusChange('Em Validação')} disabled={loading} className="w-full justify-start" variant="outline">
                <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span> Enviar para Validação
              </Button>
              
              <Button onClick={() => handleStatusChange('Transmitido')} disabled={loading} className="w-full justify-start" variant="outline">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Marcar como Transmitida
              </Button>

              <Button onClick={() => handleStatusChange('Cancelado', true)} disabled={loading} className="w-full justify-start" variant="outline">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Cancelar Declaração
              </Button>

              {!declaration.is_received && (
                <div className="pt-4 mt-2 border-t">
                  <Button onClick={handleReceive} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
                    <BanknotesIcon className="h-4 w-4 mr-2" /> Receber Pagamento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita - Histórico e Comentários */}
        <div className="md:col-span-2 space-y-6">
          <Card className="flex flex-col h-full">
            <CardHeader>
              <CardTitle>Histórico e Comentários</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto max-h-[500px] space-y-4 mb-4 pr-2">
                {interactions.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Nenhum histórico registrado.</p>
                ) : (
                  interactions.map((interaction) => (
                    <div key={interaction.id} className="flex gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium">
                          {interaction.user_name ? interaction.user_name.charAt(0).toUpperCase() : 'U'}
                        </span>
                      </div>
                      <div className="flex-1 bg-muted/30 p-3 rounded-lg border">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium">{interaction.user_name || 'Usuário'}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(interaction.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        
                        {interaction.type === 'status_change' ? (
                          <div className="space-y-1">
                            <p className="text-muted-foreground">
                              Alterou o status de <Badge variant="outline" className="text-xs">{interaction.old_status}</Badge> para <Badge variant="outline" className="text-xs">{interaction.new_status}</Badge>
                            </p>
                            {interaction.content && (
                              <p className="text-sm bg-background p-2 rounded border mt-2">
                                <span className="font-medium text-xs text-muted-foreground block mb-1">Justificativa:</span>
                                {interaction.content}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{interaction.content}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="pt-4 border-t mt-auto">
                <Label htmlFor="comment" className="sr-only">Novo comentário</Label>
                <Textarea 
                  id="comment"
                  placeholder="Digite um comentário ou anotação..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[100px] mb-2"
                />
                <div className="flex justify-end">
                  <Button onClick={handleAddComment} disabled={loading || !comment.trim()}>
                    Adicionar Comentário
                  </Button>
                </div>
              </div>
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
              Para alterar o status para <strong>{justificationDialog.targetStatus}</strong>, é necessário informar o motivo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="justification">Motivo / Justificativa</Label>
            <Textarea 
              id="justification"
              placeholder="Descreva detalhadamente o motivo desta alteração de status..."
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
    </div>
  );
}
