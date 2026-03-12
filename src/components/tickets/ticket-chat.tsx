'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { addTicketComment } from '@/app/actions/tickets';
import { toast } from 'sonner';
import { User, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Interaction {
  id: string;
  type: string;
  content: string;
  created_at: string;
  user_name: string;
  user_avatar: string;
}

interface TicketChatProps {
  ticketId: string;
  interactions: Interaction[];
  currentUserEmail?: string;
}

export function TicketChat({ ticketId, interactions, currentUserEmail }: TicketChatProps) {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await addTicketComment(ticketId, comment);
      if (result.error) {
        toast.error('Erro ao enviar comentário');
      } else {
        setComment('');
        toast.success('Comentário enviado');
      }
    } catch (error) {
      toast.error('Erro ao enviar comentário');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-[600px] border rounded-md">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {interactions.map((interaction) => (
            <div key={interaction.id} className={`flex gap-3 ${interaction.type === 'status_change' ? 'justify-center' : ''}`}>
              {interaction.type === 'comment' || interaction.type === 'creation' ? (
                <>
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={interaction.user_avatar} />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{interaction.user_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(interaction.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap">
                      {interaction.content}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                  {interaction.content} - {format(new Date(interaction.created_at), "dd/MM HH:mm", { locale: ptBR })} por {interaction.user_name}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Escreva um comentário..."
            className="min-h-[80px]"
          />
          <Button type="submit" size="icon" disabled={isSubmitting || !comment.trim()} className="h-[80px] w-[80px]">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
