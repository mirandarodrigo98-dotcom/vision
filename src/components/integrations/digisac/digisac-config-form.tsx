'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
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
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DigisacConfig, digisacConfigSchema } from '@/types/digisac';
import { saveDigisacConfig } from '@/app/actions/integrations/digisac';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DigisacConfigFormProps {
  initialConfig?: DigisacConfig;
}

export function DigisacConfigForm({ initialConfig }: DigisacConfigFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const form = useForm<DigisacConfig>({
    resolver: zodResolver(digisacConfigSchema) as any,
    defaultValues: {
      base_url: initialConfig?.base_url || 'https://api.digisac.com.br',
      api_token: initialConfig?.api_token || '',
      connection_phone: initialConfig?.connection_phone || '',
      is_active: initialConfig?.is_active || false,
    },
  });

  async function onSubmit(data: DigisacConfig) {
    setIsSaving(true);
    try {
      const result = await saveDigisacConfig(data);
      if (result.success) {
        toast.success('Configuração do Digisac salva com sucesso!');
      } else {
        toast.error('Erro ao salvar configuração.');
      }
    } catch (error) {
      toast.error('Erro inesperado ao salvar.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="border-none shadow-none">
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 rounded-t-lg"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-2">
                {isExpanded ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-primary" />}
                <h2 className="text-lg font-medium text-primary">Digisac - Criar Negócio</h2>
            </div>
            
            {/* Toggle ATIVO - Previne propagação do clique para não fechar o accordion ao clicar no switch */}
            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormLabel className="font-bold text-white bg-primary px-3 py-1 rounded-full text-xs">
                        {field.value ? 'ATIVO' : 'INATIVO'}
                      </FormLabel>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="h-6 w-6"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
            </div>
          </div>

          {isExpanded && (
            <CardContent className="pt-4 border-t">
              <div className="space-y-6">
                  
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Como integrar com a Digisac:</p>
                  
                  <div className="space-y-2">
                      <p className="text-sm text-gray-600">1. Após receber a plataforma de acesso do Digisac, acesse a raiz do site, copie a url e cole no campo abaixo</p>
                      <FormField
                          control={form.control}
                          name="base_url"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className="text-gray-500 font-normal">URL da plataforma:</FormLabel>
                              <FormControl>
                              <Input placeholder="https://nzd.digisac.biz/" {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                  </div>

                  <div className="space-y-2">
                      <p className="text-sm text-gray-600">2. Acesse <strong>Conta &gt; API &gt; Tokens de acesso pessoal</strong></p>
                      <p className="text-sm text-gray-600">3. Clique <strong>Gerar Token</strong>, copie o novo token gerado e cole no campo abaixo</p>
                      <FormField
                          control={form.control}
                          name="api_token"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className="text-gray-500 font-normal">Token de Acesso Pessoal:</FormLabel>
                              <FormControl>
                              <Input type="text" placeholder="Cole seu token aqui..." {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                  </div>

                  <div className="space-y-2">
                      <p className="text-sm text-gray-600">4. Insira o número de telefone da conexão (opcional, para referência)</p>
                      <FormField
                          control={form.control}
                          name="connection_phone"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className="text-gray-500 font-normal">Telefone da Conexão:</FormLabel>
                              <FormControl>
                              <Input type="text" placeholder="Ex: 5511999999999" {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
                      {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>

              </div>
            </CardContent>
          )}
        </Card>
      </form>
    </Form>
  );
}
