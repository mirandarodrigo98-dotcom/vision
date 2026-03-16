'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { addTicketComment } from '@/app/actions/tickets';
import { toast } from 'sonner';
import { User, Send, Paperclip, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Badge } from '@/components/ui/badge';
import { translateStatus } from '@/lib/ticket-utils';

interface Interaction {
  id: string;
  type: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar: string;
}

function formatInteractionContent(content: string) {
  let formatted = content;
  const statuses = ['open', 'in_progress', 'resolved', 'closed', 'returned', 'cancelled'];
  statuses.forEach(status => {
    const regex = new RegExp(`\\b${status}\\b`, 'g');
    formatted = formatted.replace(regex, translateStatus(status));
  });
  return formatted;
}

interface TicketChatProps {
  ticketId: string;
  interactions: Interaction[];
  currentUserEmail?: string;
}

export function TicketChat({ ticketId, interactions, currentUserEmail }: TicketChatProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!comment.trim() && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', comment);
      attachments.forEach(file => formData.append('attachments', file));

      const result = await addTicketComment(ticketId, formData);
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
            <div key={interaction.id} className={`flex gap-3 w-full max-w-full ${interaction.type === 'status_change' ? 'justify-center' : ''}`}>
              {interaction.type === 'comment' || interaction.type === 'creation' ? (
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
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full text-center break-words max-w-full whitespace-pre-wrap">
                  {formatInteractionContent(interaction.content)} - {format(new Date(interaction.created_at), "dd/MM HH:mm", { locale: ptBR })} por {interaction.user_name}
                </div>
              )}
            </div>
          ))}
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
                <Badge key={index} variant="secondary" className="gap-1">
                  {file.name}
                  <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeAttachment(index)} />
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
