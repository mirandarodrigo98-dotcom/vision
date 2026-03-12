'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Clock } from 'lucide-react';
import { AccessSchedule, AccessScheduleItem } from '@/types/access-schedule';
import { createAccessSchedule, updateAccessSchedule } from '@/app/actions/schedules';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTransition } from 'react';

const daysOfWeek = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

const scheduleSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  notification_minutes: z.coerce.number().min(1, 'Mínimo 1 minuto'),
  items: z.array(z.object({
    day_of_week: z.coerce.number().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  })).min(1, 'Adicione pelo menos uma regra de horário'),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface AccessScheduleFormProps {
  initialData?: AccessSchedule;
}

export function AccessScheduleForm({ initialData }: AccessScheduleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema) as any,
    defaultValues: initialData ? {
      name: initialData.name,
      description: initialData.description || '',
      notification_minutes: initialData.notification_minutes,
      items: initialData.items.map(item => ({
        day_of_week: item.day_of_week,
        start_time: item.start_time,
        end_time: item.end_time,
      })),
    } : {
      name: '',
      description: '',
      notification_minutes: 5,
      items: [{ day_of_week: 1, start_time: '08:00', end_time: '18:00' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  function onSubmit(values: ScheduleFormValues) {
    startTransition(async () => {
      if (initialData) {
        const result = await updateAccessSchedule(initialData.id, values);
        if (result.success) {
          toast.success('Tabela de horário atualizada com sucesso.');
          router.push('/admin/settings/access-schedules');
        } else {
          toast.error(result.error || 'Erro ao atualizar.');
        }
      } else {
        const result = await createAccessSchedule(values);
        if (result.success) {
          toast.success('Tabela de horário criada com sucesso.');
          router.push('/admin/settings/access-schedules');
        } else {
          toast.error(result.error || 'Erro ao criar.');
        }
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Tabela</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Horário Comercial" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notification_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notificação de Logout (minutos)</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormDescription>
                  Tempo antes do logout para notificar o usuário.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva a finalidade desta tabela..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Regras de Horário</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ day_of_week: 1, start_time: '08:00', end_time: '18:00' })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Regra
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-4 p-4 border rounded-md bg-muted/20">
                <FormField
                  control={form.control}
                  name={`items.${index}.day_of_week`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className={index !== 0 ? "sr-only" : ""}>Dia da Semana</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o dia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {daysOfWeek.map((day) => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.start_time`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={index !== 0 ? "sr-only" : ""}>Início</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input type="time" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`items.${index}.end_time`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={index !== 0 ? "sr-only" : ""}>Fim</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input type="time" className="pl-9" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mb-[2px]"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <FormMessage>{form.formState.errors.items?.root?.message}</FormMessage>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar Tabela'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
