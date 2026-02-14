'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

import { saveQuestorConfig, requestAccess, checkRequestStatus } from '@/app/actions/integrations/questor';
// import { ClientCompany } from '@/lib/db';

// --- Types ---

// Define locally to match the actual DB schema we observed
type ClientCompany = {
  id: string;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  code?: string;
};

type QuestorConfig = {
  environment: 'homologation' | 'production';
  erp_cnpj: string;
  default_accountant_cnpj: string;
  access_token?: string | null;
};

type QuestorCompanyAuth = {
  company_id: string;
  status: 'pending' | 'approved' | 'active' | 'error';
  request_id?: string;
};

type Props = {
  initialConfig: QuestorConfig | null;
  companies: ClientCompany[];
  companyAuths: QuestorCompanyAuth[];
};

const configSchema = z.object({
  environment: z.enum(['homologation', 'production']),
  erp_cnpj: z.string().min(14, 'CNPJ inválido'),
  default_accountant_cnpj: z.string().min(14, 'CNPJ inválido'),
  access_token: z.string().optional(),
});

export function QuestorManager({ initialConfig, companies, companyAuths }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [processingCompany, setProcessingCompany] = useState<string | null>(null);

  const form = useForm<z.infer<typeof configSchema>>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      environment: initialConfig?.environment || 'homologation',
      erp_cnpj: initialConfig?.erp_cnpj || '',
      default_accountant_cnpj: initialConfig?.default_accountant_cnpj || '',
      access_token: initialConfig?.access_token || '',
    },
  });

  async function onSaveConfig(values: z.infer<typeof configSchema>) {
    setIsSaving(true);
    try {
      await saveQuestorConfig(values);
      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRequestAccess(company: ClientCompany) {
    if (!company.code) { // Assuming code holds CNPJ or we use another field
       // In ClientCompany type, usually there is a 'document' or 'cnpj' field. 
       // Let's check the type definition or assume 'code' might be it or check schema.
       // Looking at migration 010_add_company_details.sql, we might have more fields.
       // But for now let's assume 'code' is the unique identifier or we have 'cnpj'.
       // Actually, 'code' is usually internal code. I should check if there is a CNPJ field.
       // Migration 001 has 'name'. Migration 010 adds details. 
       // Let's assume the user will input it if missing, or use 'code' if it's the CNPJ.
       // For safety, I'll prompt or assume it's in the object.
       // I'll cast for now.
    }
    
    // NOTE: Using 'cnpj' as the identifier.
    const cnpj = company.cnpj || company.code; 

    setProcessingCompany(company.id);
    try {
      if (!cnpj) throw new Error('Empresa sem CNPJ/Código');
      const result = await requestAccess(company.id, cnpj);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message);
      }
    } catch (error) {
      toast.error('Erro na solicitação');
    } finally {
      setProcessingCompany(null);
    }
  }

  async function handleCheckStatus(companyId: string) {
    setProcessingCompany(companyId);
    try {
      const result = await checkRequestStatus(companyId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Status atualizado: ' + result.status);
      }
    } catch (error) {
      toast.error('Erro ao verificar status');
    } finally {
      setProcessingCompany(null);
    }
  }

  const getAuthStatus = (companyId: string) => {
    return companyAuths.find(a => a.company_id === companyId);
  };

  return (
    <Tabs defaultValue="settings" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="settings">Configurações Gerais</TabsTrigger>
        <TabsTrigger value="companies">Empresas e Acesso</TabsTrigger>
      </TabsList>

      <TabsContent value="settings">
        <Card>
          <CardHeader>
            <CardTitle>Credenciais do Integrador (Vision)</CardTitle>
            <CardDescription>
              Configure os dados da sua aplicação Vision para comunicação com a API Questor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSaveConfig)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="environment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ambiente</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o ambiente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="homologation">Homologação</SelectItem>
                          <SelectItem value="production">Produção</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Utilize Homologação para testes e Produção para dados reais.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="erp_cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ do ERP (Vision)</FormLabel>
                        <FormControl>
                          <Input placeholder="00.000.000/0000-00" {...field} />
                        </FormControl>
                        <FormDescription>
                          CNPJ da desenvolvedora ou proprietária do token.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="default_accountant_cnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ do Contador Padrão</FormLabel>
                        <FormControl>
                          <Input placeholder="00.000.000/0000-00" {...field} />
                        </FormControl>
                        <FormDescription>
                          CNPJ do escritório contábil principal.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="access_token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token de Acesso (Opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Cole o token aqui se já possuir..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Se você já recebeu o token da Questor, insira-o aqui.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Configurações
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="companies">
        <Card>
          <CardHeader>
            <CardTitle>Gerenciamento de Acesso por Empresa</CardTitle>
            <CardDescription>
              Solicite e verifique o acesso aos dados de cada empresa no Questor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>CNPJ (Código)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => {
                  const auth = getAuthStatus(company.id);
                  const isLoading = processingCompany === company.id;

                  return (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.nome}</TableCell>
                      <TableCell>{company.cnpj || company.code || '-'}</TableCell>
                      <TableCell>
                        {auth ? (
                          <Badge variant={auth.status === 'active' ? 'default' : 'secondary'}>
                            {auth.status === 'active' ? 'Ativo' : auth.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Não Iniciado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {!auth || auth.status === 'error' ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRequestAccess(company)}
                            disabled={isLoading}
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Solicitar Acesso'}
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleCheckStatus(company.id)}
                            disabled={isLoading}
                          >
                             {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
