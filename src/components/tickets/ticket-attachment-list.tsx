'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Paperclip, FileText, Download, Trash2, Loader2 } from 'lucide-react';
import { deleteTicketAttachment } from '@/app/actions/tickets-delete';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TicketAttachment {
  id: string;
  url: string;
  original_name: string;
  size: number;
  content_type: string;
}

interface TicketAttachmentListProps {
  attachments: TicketAttachment[];
  ticketId: string;
  isAdmin: boolean;
}

export function TicketAttachmentList({ attachments, ticketId, isAdmin }: TicketAttachmentListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (attachmentId: string) => {
    setIsDeleting(attachmentId);
    try {
      const result = await deleteTicketAttachment(attachmentId, ticketId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Anexo excluído com sucesso');
      }
    } catch (error) {
      toast.error('Erro ao excluir anexo');
    } finally {
      setIsDeleting(null);
    }
  };

  if (!attachments || attachments.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          Anexos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {attachments.map((att) => (
            <div 
              key={att.id} 
              className="flex items-center gap-3 p-3 border rounded-md hover:bg-muted/50 transition-colors group relative"
            >
              <div className="bg-primary/10 p-2 rounded text-primary shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <a 
                  href={att.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block hover:underline"
                >
                  <p className="text-sm font-medium truncate" title={att.original_name}>
                    {att.original_name}
                  </p>
                </a>
                <p className="text-xs text-muted-foreground">
                  {Math.round(att.size / 1024)} KB
                </p>
              </div>

              <div className="flex items-center gap-1">
                <a 
                  href={att.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-full transition-colors"
                  title="Baixar"
                >
                  <Download className="h-4 w-4" />
                </a>
                
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button 
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                        title="Excluir"
                        disabled={isDeleting === att.id}
                      >
                        {isDeleting === att.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir anexo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o anexo "{att.original_name}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(att.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
