'use client';

import { ReactNode, useState } from 'react';
import { SolicitationTypeSelectorDialog } from '@/components/solicitations/solicitation-type-selector-dialog';

interface RequestTypeOption {
  id: string;
  name: string;
  description?: string | null;
  department_name: string;
}

interface ClientSolicitationsPageClientProps {
  children: ReactNode;
  requestTypes: RequestTypeOption[];
}

export function ClientSolicitationsPageClient({
  children,
  requestTypes,
}: ClientSolicitationsPageClientProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="inline-flex cursor-pointer" onClick={() => setOpen(true)} role="button" tabIndex={0} onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setOpen(true);
        }
      }}>
        {children}
      </div>
      <SolicitationTypeSelectorDialog
        open={open}
        onOpenChange={setOpen}
        requestTypes={requestTypes}
      />
    </>
  );
}
