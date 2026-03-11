import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getAccessSchedules, deleteAccessSchedule } from '@/app/actions/schedules';
import { DeleteScheduleButton } from './delete-button';

export default async function AccessSchedulesPage() {
  const schedules = await getAccessSchedules();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">Tabelas de Horários</h2>
        </div>
        <Link href="/admin/settings/access-schedules/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Tabela
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Horários de Acesso</CardTitle>
          <CardDescription>
            Gerencie os horários permitidos para acesso ao sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Notificação (min)</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma tabela de horário cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.name}</TableCell>
                    <TableCell>{schedule.description || '-'}</TableCell>
                    <TableCell>{schedule.notification_minutes} min</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/settings/access-schedules/${schedule.id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <DeleteScheduleButton id={schedule.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
