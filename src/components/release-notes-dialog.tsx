'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { APP_VERSION } from '@/lib/version';
import { RELEASE_NOTES, shouldShowReleaseNotes, getNotesToShow, ReleaseNote } from '@/lib/release-notes';

const STORAGE_KEY = 'vision_last_seen_version';

export function ReleaseNotesDialog() {
  const [open, setOpen] = useState(false);
  const [notesToShow, setNotesToShow] = useState<ReleaseNote[]>([]);

  useEffect(() => {
    // Only run on client side
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    
    if (shouldShowReleaseNotes(APP_VERSION, lastSeen)) {
      // Se lastSeen for null (primeiro acesso com essa feature), mostra apenas a versão atual para não encher a tela
      const notes = getNotesToShow(lastSeen);
      
      // Group by module
      setNotesToShow(notes);
      setOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    setOpen(false);
  };

  if (notesToShow.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Prevent closing by clicking outside if we want to force them to acknowledge, 
      // but let's be nice and let them close it, it will just pop up again next time if they don't click "Não mostrar"
      // Actually, if they close it via X or outside click, we might not want to save to localStorage
      // so it shows again until they click the specific button.
      if (!val) setOpen(false);
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            🚀 Novidades do Sistema
            <Badge variant="secondary" className="ml-2 text-xs">v{APP_VERSION}</Badge>
          </DialogTitle>
          <DialogDescription>
            Confira as últimas melhorias e novos recursos que preparamos para você.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4 mt-4">
          <div className="space-y-6">
            {notesToShow.map((release) => {
              // Group notes by module for this release
              const byModule = release.notes.reduce((acc, note) => {
                if (!acc[note.module]) acc[note.module] = [];
                acc[note.module].push(note.description);
                return acc;
              }, {} as Record<string, string[]>);

              return (
                <div key={release.version} className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <h3 className="font-semibold text-lg">Versão {release.version}</h3>
                    <span className="text-sm text-muted-foreground">
                      ({new Date(release.date).toLocaleDateString('pt-BR')})
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(byModule).map(([module, descriptions]) => (
                      <div key={module} className="space-y-1.5">
                        <h4 className="font-medium text-sm text-primary flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {module}
                        </h4>
                        <ul className="list-disc list-inside space-y-1 ml-4 text-sm text-muted-foreground">
                          {descriptions.map((desc, i) => (
                            <li key={i}>{desc}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-6 border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Lembrar mais tarde
          </Button>
          <Button onClick={handleDismiss}>
            Entendi, não mostrar novamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
