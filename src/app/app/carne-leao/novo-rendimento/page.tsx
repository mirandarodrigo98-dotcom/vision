'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export default function NovoRendimentoPage() {
  const [tipoRendimento, setTipoRendimento] = useState<'trabalho' | 'outros'>('trabalho');
  const [recebidoDe, setRecebidoDe] = useState<'pf' | 'pj'>('pf');
  const [valor, setValor] = useState('R$ 0,00');
  const [valorIrrf, setValorIrrf] = useState('R$ 0,00');

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/app/carne-leao">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-[#1b5fcc] text-white hover:bg-[#154ca3] hover:text-white border-0">
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h2 className="text-3xl font-normal text-foreground tracking-tight">Rendimento</h2>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full text-[#1b5fcc] hover:text-[#154ca3] hover:bg-blue-50">
          <HelpCircle className="h-6 w-6" />
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-sm border-gray-200">
          <CardContent className="pt-6 space-y-6">
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit mx-auto mb-8">
              <Button 
                variant={tipoRendimento === 'trabalho' ? 'default' : 'ghost'}
                className={`rounded-lg px-6 h-12 transition-all ${tipoRendimento === 'trabalho' ? 'bg-[#1b5fcc] hover:bg-[#154ca3] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setTipoRendimento('trabalho')}
              >
                Trabalho Não Assalariado
              </Button>
              <Button 
                variant={tipoRendimento === 'outros' ? 'default' : 'ghost'}
                className={`rounded-lg px-6 h-12 transition-all ${tipoRendimento === 'outros' ? 'bg-[#1b5fcc] hover:bg-[#154ca3] text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setTipoRendimento('outros')}
              >
                Outros Rendimentos
              </Button>
            </div>

            {tipoRendimento === 'trabalho' && (
              <div className="space-y-2">
                <Label className="text-[#1b5fcc] font-semibold text-sm">Ocupação</Label>
                <Select defaultValue="economista">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecionar Ocupação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economista">Economista, administrador, contador, auditor e afins</SelectItem>
                    <SelectItem value="medico">Médico</SelectItem>
                    <SelectItem value="advogado">Advogado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[#1b5fcc] font-semibold text-sm">Natureza</Label>
              <Select defaultValue={tipoRendimento === 'trabalho' ? "trabalho" : "alugueis"}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecionar Rendimento" />
                </SelectTrigger>
                <SelectContent>
                  {tipoRendimento === 'trabalho' ? (
                    <SelectItem value="trabalho">Trabalho Não Assalariado</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="alugueis">Aluguéis</SelectItem>
                      <SelectItem value="exterior">Rendimentos do Exterior</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#1b5fcc] font-semibold text-sm">Data do Recebimento</Label>
              <Input type="date" className="w-full max-w-[200px]" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardContent className="pt-6 space-y-6">
              
              {tipoRendimento === 'trabalho' && (
                <div className="space-y-4 mb-6 pb-6 border-b border-gray-100">
                  <Label className="text-[#1b5fcc] font-semibold text-sm">Recebido de</Label>
                  <RadioGroup defaultValue="pf" onValueChange={(v) => setRecebidoDe(v as 'pf' | 'pj')} className="flex space-x-6">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pf" id="r1" className="text-[#1b5fcc] border-gray-300" />
                      <Label htmlFor="r1" className="text-sm font-normal text-slate-600 cursor-pointer">Pessoa Física</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pj" id="r2" className="text-[#1b5fcc] border-gray-300" />
                      <Label htmlFor="r2" className="text-sm font-normal text-slate-600 cursor-pointer">Pessoa Jurídica</Label>
                    </div>
                  </RadioGroup>

                  <div className="pt-4">
                    {recebidoDe === 'pf' ? (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-600">Recebido de</Label>
                          <Input placeholder="Informe o CPF do responsáve..." className="text-sm" />
                        </div>
                        <div className="space-y-2 flex flex-col justify-end pb-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="titular" />
                            <Label htmlFor="titular" className="text-xs font-semibold text-[#1b5fcc] cursor-pointer">Titular é o beneficiário</Label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-600">Beneficiário do Serviço</Label>
                          <Input placeholder="Informe o CPF do cliente/paci..." className="text-sm" />
                        </div>
                        <div className="space-y-2 flex flex-col justify-end pb-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="cpf_nao_inf" />
                            <Label htmlFor="cpf_nao_inf" className="text-xs font-semibold text-[#1b5fcc] cursor-pointer">CPF não informado</Label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-w-[200px]">
                        <Label className="text-xs font-semibold text-[#1b5fcc]">CNPJ</Label>
                        <Input placeholder="Informe um CNPJ" className="text-sm" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[#1b5fcc] font-semibold text-sm">Histórico</Label>
                <Textarea 
                  placeholder="Informe um texto com até 255 caracteres" 
                  maxLength={255}
                  className="resize-none h-20"
                />
              </div>

              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <Label className="text-[#1b5fcc] font-semibold text-sm">Valor</Label>
                  <Input 
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full text-right" 
                  />
                </div>

                {tipoRendimento === 'trabalho' && recebidoDe === 'pj' && (
                  <div className="space-y-2 flex-1">
                    <Label className="text-[#1b5fcc] font-semibold text-sm">Valor IRRF</Label>
                    <Input 
                      value={valorIrrf}
                      onChange={(e) => setValorIrrf(e.target.value)}
                      className="w-full text-right" 
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Button className="w-full h-12 bg-[#e2e8f0] text-slate-400 hover:bg-slate-300 font-semibold rounded-lg" disabled>
            INCLUIR RENDIMENTO
          </Button>
        </div>
      </div>
    </div>
  );
}