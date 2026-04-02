'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { addIRComment } from '@/app/actions/imposto-renda';
import { toast } from 'sonner';
import { User, Send, Paperclip, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Badge } from '@/components/ui/badge';

interface Interaction {
  id: string;
  type: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar: string;
  old_status?: string;
  new_status?: string;
  attachments?: {
    id: string;
    original_name: string;
    size: number;
    url: string;
  }[];
}

function formatInteractionContent(interaction: Interaction) {
  if (interaction.type === 'status_change') {
    let actionStr = `Status alterado para ${interaction.new_status}`;
    if (interaction.new_status === 'Iniciado') actionStr = `Declaração Iniciada`;
    if (interaction.new_status === 'Validada') actionStr = `Declaração Validada`;
    if (interaction.new_status === 'Transmitida') actionStr = `Declaração Transmitida`;
    if (interaction.new_status === 'Processada') actionStr = `Declaração Processada`;
    if (interaction.new_status === 'Pendente') actionStr = `Alterado para Pendente`;
    if (interaction.new_status === 'Malha Fina') actionStr = `Caiu na Malha Fina`;
    if (interaction.new_status === 'Retificadora') actionStr = `Alterado para Retificadora`;
    if (interaction.new_status === 'Reaberta') actionStr = `Declaração Reaberta`;
    if (interaction.new_status === 'Cancelada') actionStr = `Declaração Cancelada`;
    
    return (
      <span>
        <strong>{actionStr}</strong>
        {interaction.content ? ` (Motivo: ${interaction.content})` : ''}
      </span>
    );
  }
  
  if (interaction.type === 'creation') {
    return <strong>Declaração Iniciada</strong>;
  }
  
  if (interaction.type === 'document') {
    return <span><strong>Documento Adicionado:</strong> {interaction.content}</span>;
  }
  
  if (interaction.type === 'priority_change') {
    return <span><strong>Prioridade Alterada:</strong> {interaction.content}</span>;
  }
  
  if (interaction.type === 'field_change') {
    return <span><strong>Campo Alterado:</strong> {interaction.content}</span>;
  }

  return <span>{interaction.content || 'Interação'}</span>;
}

interface IRChatProps {
  declarationId: string;
  interactions: Interaction[];
  currentUserEmail?: string;
  status?: string;
}

export function IRChat({ declarationId, interactions, currentUserEmail, status }: IRChatProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [interactions]);

  async function handleSubmit() {
    if (!comment.trim() && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', comment);
      attachments.forEach(file => formData.append('attachments', file));

      const result = await addIRComment(declarationId, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        setComment('');
        setAttachments([]);
        toast.success('Comentário enviado');
      }
    } catch (error) {
      toast.error('Erro ao enviar comentário');
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(file => file.size <= 2 * 1024 * 1024);
      
      if (validFiles.length !== newFiles.length) {
        toast.error('Alguns arquivos foram ignorados por excederem 2MB');
      }
      
      setAttachments(prev => [...prev, ...validFiles]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-[600px] border rounded-md w-full max-w-full">
      <ScrollArea className="flex-1 p-4 w-full">
        <div className="space-y-4 w-full max-w-full">
          {interactions.map((interaction) => (
            <div key={interaction.id} className={`flex gap-3 w-full max-w-full ${interaction.type === 'status_change' || interaction.type === 'field_change' || interaction.type === 'creation' ? 'justify-center' : ''}`}>
              {interaction.type === 'comment' ? (
                <>
                  <Avatar className="h-8 w-8 mt-1 shrink-0">
                    <AvatarImage src={interaction.user_avatar} />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 min-w-0 max-w-full">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm">{interaction.user_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(interaction.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div 
                      className="bg-muted p-3 rounded-lg text-sm w-full max-w-full break-words whitespace-pre-wrap overflow-hidden [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>img]:max-w-full [&>img]:rounded-md"
                      dangerouslySetInnerHTML={{ __html: interaction.content }} 
                    />
                    
                    {interaction.attachments && interaction.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {interaction.attachments.map((att: any) => (
                          <a 
                            key={att.id} 
                            href={att.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 p-1.5 border rounded bg-background hover:bg-muted text-xs transition-colors"
                          >
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                            <span className="truncate max-w-[150px]">{att.original_name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full text-center break-words max-w-full whitespace-pre-wrap">
                  {formatInteractionContent(interaction)} - {format(new Date(interaction.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} por {interaction.user_name}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t bg-background">
        <div className="space-y-2">
            <RichTextEditor 
              value={comment} 
              onChange={setComment} 
              placeholder="Escreva um comentário..." 
              className="bg-background"
            />
            
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 pr-1 pl-2 py-1 flex items-center">
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAttachment(index);
                      }}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5 transition-colors focus:outline-none"
                    >
                      <X size={14} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <div>
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                />
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} type="button">
                  <Paperclip size={16} className="mr-2" /> Anexar Arquivo (Max 2MB)
                </Button>
              </div>
              <Button onClick={handleSubmit} disabled={isSubmitting || (!comment.trim() && attachments.length === 0)}>
                Enviar <Send size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        </div>
    </div>
  );
}
