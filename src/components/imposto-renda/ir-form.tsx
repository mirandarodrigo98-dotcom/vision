'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createIRDeclaration } from '@/app/actions/imposto-renda';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { getActiveUsersForSelect } from '@/app/actions/team';
import { getIRPartners } from '@/app/actions/ir-partners';

// Usar o seletor de empresa existente nos tickets
import { TicketCompanySelector } from '@/components/tickets/ticket-company-selector';

export function IRForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'Sócio' | 'Particular'>('Particular');
  const [companyId, setCompanyId] = useState<string>('');
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  
  // Novos campos de indicação
  const [indicationType, setIndicationType] = useState<'none' | 'user' | 'partner'>('none');
  const [indicatedByUserId, setIndicatedByUserId] = useState<string>('');
  const [indicatedByPartnerId, setIndicatedByPartnerId] = useState<string>('');
  const [serviceValue, setServiceValue] = useState<string>('');
  const [priority, setPriority] = useState<'Baixa' | 'Média' | 'Alta' | 'Crítica'>('Média');
  const [cpf, setCpf] = useState<string>('');
  
  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  const [partners, setPartners] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, partnersData] = await Promise.all([
          getActiveUsersForSelect(),
          getIRPartners()
        ]);
        setUsers(usersData);
        setPartners(partnersData);
      } catch (e) {
        console.error("Failed to load indication options", e);
      }
    };
    loadData();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const onlyDigits = (s: string) => s.replace(/\D/g, '');
      const isValidCpf = (s: string) => {
        const d = onlyDigits(s);
        if (d.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(d)) return false;
        const calc = (base: number) => {
          let sum = 0;
          for (let i = 0; i < base; i++) sum += parseInt(d[i]) * (base + 1 - i);
          const r = (sum * 10) % 11;
          return r === 10 ? 0 : r;
        };
        return calc(9) === parseInt(d[9]) && calc(10) === parseInt(d[10]);
      };
      if (!isValidCpf(formData.get('cpf') as string)) {
        toast.error('CPF inválido.');
        setLoading(false);
        return;
      }
      const parseMoney = (s?: string) => {
        if (!s) return undefined;
        const v = s.replace(/\./g, '').replace(',', '.');
        const n = parseFloat(v);
        if (isNaN(n)) return undefined;
        return n;
      };
      const data = {
        name: formData.get('name') as string,
        year: formData.get('year') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        cpf: formData.get('cpf') as string,
        type,
        company_id: type === 'Sócio' ? companyId : undefined,
        send_whatsapp: sendWhatsapp,
        send_email: sendEmail,
        indicated_by_user_id: indicationType === 'user' ? indicatedByUserId : undefined,
        indicated_by_partner_id: indicationType === 'partner' ? indicatedByPartnerId : undefined,
        service_value: parseMoney(serviceValue),
        priority
      };

      if (type === 'Sócio' && !companyId) {
        toast.error('Selecione uma empresa para o sócio.');
        setLoading(false);
        return;
      }
      
      if (indicationType === 'user' && !indicatedByUserId) {
        toast.error('Selecione o usuário que indicou.');
        setLoading(false);
        return;
      }

      if (indicationType === 'partner' && !indicatedByPartnerId) {
        toast.error('Selecione o parceiro que indicou.');
        setLoading(false);
        return;
      }

      await createIRDeclaration(data);
      toast.success('Declaração incluída com sucesso!');
      router.push('/admin/pessoa-fisica/imposto-renda');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao incluir declaração.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/admin/pessoa-fisica/imposto-renda">
            <Button variant="ghost" size="icon">
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
          <CardTitle>Nova Declaração de Imposto de Renda</CardTitle>
        </div>
        <CardDescription>
          Preencha os dados do contribuinte para iniciar o acompanhamento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Contribuinte</Label>
            <Input id="name" name="name" required placeholder="Ex: João da Silva" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input 
              id="cpf" 
              name="cpf" 
              required 
              placeholder="000.000.000-00" 
              value={cpf}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 11);
                let m = v;
                if (v.length > 9) m = v.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, '$1.$2.$3-$4');
                else if (v.length > 6) m = v.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, '$1.$2.$3');
                else if (v.length > 3) m = v.replace(/^(\d{3})(\d{0,3}).*/, '$1.$2');
                setCpf(m);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Exercício</Label>
              <Input id="year" name="year" required placeholder="Ex: 2026" defaultValue={new Date().getFullYear().toString()} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (Opcional)</Label>
              <Input id="phone" name="phone" placeholder="+55 (00) 00000-0000" defaultValue="+55 " />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail (Opcional)</Label>
            <Input id="email" name="email" type="email" placeholder="joao@exemplo.com" />
          </div>

          <div className="space-y-3 border p-4 rounded-md">
            <Label className="text-base font-semibold">Ativar Envio de Notificações</Label>
            <div className="flex flex-col space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="send_whatsapp" className="cursor-pointer text-sm font-medium">
                  Whatsapp
                </Label>
                <Switch
                  id="send_whatsapp"
                  checked={sendWhatsapp}
                  onCheckedChange={setSendWhatsapp}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="send_email" className="cursor-pointer text-sm font-medium">
                  E-mail
                </Label>
                <Switch
                  id="send_email"
                  checked={sendEmail}
                  onCheckedChange={setSendEmail}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Tipo de Contribuinte</Label>
            <div className="flex flex-col space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="type_radio"
                  value="Particular"
                  checked={type === 'Particular'}
                  onChange={() => setType('Particular')}
                  className="h-4 w-4 text-primary"
                />
                <span>Particular</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="type_radio"
                  value="Sócio"
                  checked={type === 'Sócio'}
                  onChange={() => setType('Sócio')}
                  className="h-4 w-4 text-primary"
                />
                <span>Sócio</span>
              </label>
            </div>
          </div>

          {type === 'Sócio' && (
            <div className="space-y-2 border p-4 rounded-md bg-muted/30">
              <Label>Empresa Vinculada</Label>
              <TicketCompanySelector
                value={companyId}
                onSelect={setCompanyId}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ao selecionar a empresa, os dados básicos poderão ser consultados posteriormente.
              </p>
            </div>
          )}

          <div className="space-y-4 border p-4 rounded-md">
            <Label className="text-base font-semibold">Indicação e Valores</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Indicação</Label>
                <Select value={indicationType} onValueChange={(val: any) => {
                  setIndicationType(val);
                  if (val !== 'user') setIndicatedByUserId('');
                  if (val !== 'partner') setIndicatedByPartnerId('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="user">Usuário Interno</SelectItem>
                    <SelectItem value="partner">Parceiro Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {indicationType === 'user' && (
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Select value={indicatedByUserId} onValueChange={setIndicatedByUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o usuário..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {indicationType === 'partner' && (
                <div className="space-y-2">
                  <Label>Parceiro</Label>
                  <Select value={indicatedByPartnerId} onValueChange={setIndicatedByPartnerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o parceiro..." />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="service_value">Valor do Serviço (R$)</Label>
              <Input 
                id="service_value" 
                type="text"
                inputMode="numeric"
                placeholder="0,00" 
                value={serviceValue}
                onChange={e => {
                  const raw = e.target.value;
                  const digits = raw.replace(/\D/g, '');
                  if (!digits) {
                    setServiceValue('');
                    return;
                  }
                  const int = digits.slice(0, Math.max(0, digits.length - 2));
                  const dec = digits.slice(Math.max(0, digits.length - 2)).padStart(2, '0');
                  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                  setServiceValue(`${intFmt || '0'},${dec}`);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Usado para cálculo da premiação caso haja indicação.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Crítica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Link href="/admin/pessoa-fisica/imposto-renda">
              <Button variant="outline" type="button">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar e Iniciar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
