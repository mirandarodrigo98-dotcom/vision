'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { upsertSocietarioProfile } from '@/app/actions/societario';

interface SocietarioProfile {
  company_id: string;
  data_constituicao?: string | null;
  responsavel_legal?: string | null;
  capital_social_centavos?: number | null;
  email_institucional?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  status?: 'EM_REGISTRO' | 'ATIVA' | 'INATIVA';
}

interface LogItem {
  id: string;
  tipo_evento: string;
  campo_alterado?: string | null;
  valor_anterior?: string | null;
  valor_novo?: string | null;
  motivo?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  created_at: string;
}

interface Props {
  companyId: string;
  initialProfile: SocietarioProfile | null;
  initialLogs: LogItem[];
}

export function SocietarioForm({ companyId, initialProfile, initialLogs }: Props) {
  const [pending, startTransition] = useTransition();
  const [profile, setProfile] = useState<SocietarioProfile>(() => ({
    company_id: companyId,
    data_constituicao: initialProfile?.data_constituicao || undefined,
    responsavel_legal: initialProfile?.responsavel_legal || undefined,
    capital_social_centavos: initialProfile?.capital_social_centavos ?? undefined,
    email_institucional: initialProfile?.email_institucional || undefined,
    endereco: initialProfile?.endereco || undefined,
    telefone: initialProfile?.telefone || undefined,
    status: initialProfile?.status || 'EM_REGISTRO',
  }));
  const [logs, setLogs] = useState<LogItem[]>(initialLogs);

  useEffect(() => {
    setProfile({
      company_id: companyId,
      data_constituicao: initialProfile?.data_constituicao || undefined,
      responsavel_legal: initialProfile?.responsavel_legal || undefined,
      capital_social_centavos: initialProfile?.capital_social_centavos ?? undefined,
      email_institucional: initialProfile?.email_institucional || undefined,
      endereco: initialProfile?.endereco || undefined,
      telefone: initialProfile?.telefone || undefined,
      status: initialProfile?.status || 'EM_REGISTRO',
    });
    setLogs(initialLogs);
  }, [companyId, initialProfile, initialLogs]);

  const handleSubmit = () => {
    const fd = new FormData();
    fd.append('company_id', profile.company_id);
    if (profile.data_constituicao) fd.append('data_constituicao', profile.data_constituicao);
    if (profile.responsavel_legal) fd.append('responsavel_legal', profile.responsavel_legal);
    if (profile.capital_social_centavos != null) fd.append('capital_social_centavos', String(profile.capital_social_centavos));
    if (profile.email_institucional) fd.append('email_institucional', profile.email_institucional);
    if (profile.endereco) fd.append('endereco', profile.endereco);
    if (profile.telefone) fd.append('telefone', profile.telefone);
    if (profile.status) fd.append('status', profile.status);

    startTransition(async () => {
      const res = await upsertSocietarioProfile(fd);
      if ((res as any).error) {
        toast.error((res as any).error);
      } else {
        toast.success('Dados societários salvos');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Perfil Societário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Constituição</Label>
              <DatePicker
                date={profile.data_constituicao ? new Date(profile.data_constituicao) : undefined}
                setDate={(d) =>
                  setProfile((p) => ({
                    ...p,
                    data_constituicao: d ? format(d, 'yyyy-MM-dd') : undefined,
                  }))
                }
                placeholder="Selecione"
              />
            </div>
            <div className="space-y-2">
              <Label>Responsável Legal</Label>
              <Input
                value={profile.responsavel_legal || ''}
                onChange={(e) => setProfile((p) => ({ ...p, responsavel_legal: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Capital Social (centavos)</Label>
              <Input
                type="number"
                value={profile.capital_social_centavos ?? ''}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    capital_social_centavos: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email Institucional</Label>
              <Input
                type="email"
                value={profile.email_institucional || ''}
                onChange={(e) => setProfile((p) => ({ ...p, email_institucional: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Endereço</Label>
              <Input
                value={profile.endereco || ''}
                onChange={(e) => setProfile((p) => ({ ...p, endereco: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={profile.telefone || ''}
                onChange={(e) => setProfile((p) => ({ ...p, telefone: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={profile.status || 'EM_REGISTRO'}
                onValueChange={(val) => setProfile((p) => ({ ...p, status: val as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EM_REGISTRO">Em Registro</SelectItem>
                  <SelectItem value="ATIVA">Ativa</SelectItem>
                  <SelectItem value="INATIVA">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={pending}>
              {pending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sem eventos registrados.</div>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="text-sm">
                  <div className="font-medium">{l.tipo_evento}</div>
                  {l.campo_alterado && (
                    <div className="text-muted-foreground">
                      {l.campo_alterado}: {l.valor_anterior || '-'} → {l.valor_novo || '-'}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {l.actor_name || l.actor_email || 'Sistema'} • {new Date(l.created_at).toLocaleString('pt-BR')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
