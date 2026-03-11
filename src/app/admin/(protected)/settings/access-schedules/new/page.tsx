import { AccessScheduleForm } from '@/components/admin/settings/access-schedule-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewAccessSchedulePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/settings/access-schedules">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">Nova Tabela de Horário</h2>
      </div>

      <div className="max-w-4xl">
        <AccessScheduleForm />
      </div>
    </div>
  );
}
