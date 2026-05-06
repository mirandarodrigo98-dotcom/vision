'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { InfoIcon, ArrowLeft, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ViabilidadeWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  // Step 1 State
  const [eventoInscricao, setEventoInscricao] = useState<string>('');
  const [eventosAlteracao, setEventosAlteracao] = useState<string[]>([]);

  // Step 2 State
  const [enquadramento, setEnquadramento] = useState<string>('Micro Empresa');
  const [orgaoRegistro, setOrgaoRegistro] = useState<string>('');

  const handleNext = () => {
    if (step === 1) {
      if (!eventoInscricao && eventosAlteracao.length === 0) {
        alert('Selecione pelo menos um evento para avançar.');
        return;
      }
      setStep(2);
    } else {
      // Avançar para próximos passos que ainda serão construídos
      alert('Próximos passos em construção...');
    }
  };

  const handleBack = () => {
    if (step === 1) {
      router.push('/admin/societario/viabilidade');
    } else {
      setStep(step - 1);
    }
  };

  const toggleEventoAlteracao = (evento: string) => {
    setEventosAlteracao(prev => 
      prev.includes(evento) 
        ? prev.filter(e => e !== evento)
        : [...prev, evento]
    );
  };

  return (
    <div className="space-y-6">
      {step === 1 && (
        <Card className="border shadow-sm">
          <CardHeader className="bg-slate-50 border-b flex flex-row items-center gap-2 pb-4">
            <CardTitle className="text-xl font-medium text-slate-700 flex items-center gap-2">
              <span className="text-slate-400">✛</span> Selecione o(s) evento(s) da Viabilidade
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="bg-sky-50 border-l-4 border-sky-500 p-4 text-sm text-sky-800 rounded-r-md flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-sky-500 flex-shrink-0" />
              <p>Alguns eventos de alteração podem ser marcados simultaneamente. O nome reservado está sujeito a análise técnica durante a análise do processo pela Junta Comercial.</p>
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="bg-slate-100 p-3 border-b">
                <h3 className="font-medium text-slate-700">Eventos de Inscrição</h3>
              </div>
              <div className="p-5">
                <p className="font-medium mb-3 text-sm text-slate-800">Selecione o evento de inscrição:</p>
                <RadioGroup value={eventoInscricao} onValueChange={(val) => {
                  setEventoInscricao(val);
                  setEventosAlteracao([]); // Limpa alterações se selecionar inscrição? (Conforme fluxo da imagem, geralmente são mutuamente exclusivos na prática, mas mantemos separados no estado)
                }} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Inscrição de primeiro estabelecimento (Matriz)" id="i1" />
                    <Label htmlFor="i1" className="font-normal cursor-pointer">Inscrição de primeiro estabelecimento (Matriz)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Inscrição dos demais estabelecimentos (Filial)" id="i2" />
                    <Label htmlFor="i2" className="font-normal cursor-pointer">Inscrição dos demais estabelecimentos (Filial)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Proteção de Nome Empresarial" id="i3" />
                    <Label htmlFor="i3" className="font-normal cursor-pointer">Proteção de Nome Empresarial</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Inscrição de missões dipl./repart. consul./repres. de órgãos internacionais" id="i4" />
                    <Label htmlFor="i4" className="font-normal cursor-pointer">Inscrição de missões dipl./repart. consul./repres. de órgãos internacionais</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="bg-slate-100 p-3 border-b">
                <h3 className="font-medium text-slate-700">Eventos de Alteração</h3>
              </div>
              <div className="p-5">
                <p className="font-medium mb-3 text-sm text-slate-800">Selecione o evento de alteração:</p>
                <div className="space-y-3">
                  {[
                    "Alteração do nome empresarial (firma ou denominação)",
                    "Alteração de atividades econômicas (principal e secundárias)",
                    "Alteração de endereço dentro do mesmo município",
                    "Alteração de endereço entre municípios dentro do mesmo estado",
                    "Alteração de endereço entre estados",
                    "Alteração da natureza jurídica",
                    "Alteração da forma de atuação",
                    "Alteração do tipo de unidade",
                    "Reativação - Artigo 60 Lei 8.934/94",
                    "Alteração de dados do imóvel",
                    "Licenciamento de Estabelecimento anteriormente registrado (Legado)",
                    "Alteração de área utilizada pelo estabelecimento",
                    "Alteração do endereço do estabelecimento vinculado",
                    "Correção do número de inscrição imobiliária",
                    "Desdobramento de atividades econômicas (principal e secundárias)",
                    "Inscrição municipal vinculada a CNPJ já cadastrado para outro estabelecimento",
                    "Inscrição no município"
                  ].map((evento, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`alt-${idx}`} 
                        checked={eventosAlteracao.includes(evento)}
                        onCheckedChange={() => {
                          toggleEventoAlteracao(evento);
                          setEventoInscricao(''); // Limpa inscrição se marcar alteração
                        }}
                      />
                      <Label htmlFor={`alt-${idx}`} className="font-normal cursor-pointer leading-tight">{evento}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border shadow-sm">
          <CardHeader className="bg-slate-50 border-b flex flex-row items-center gap-2 pb-4">
            <CardTitle className="text-xl font-medium text-slate-700 flex items-center gap-2">
              <span className="text-slate-400">✛</span> Selecione a Natureza jurídica e o Órgão de registro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="border rounded-md overflow-hidden">
              <div className="bg-slate-100 p-3 border-b">
                <h3 className="font-medium text-slate-700 text-sm">Selecione o Enquadramento:</h3>
              </div>
              <div className="p-5">
                <RadioGroup value={enquadramento} onValueChange={setEnquadramento} className="flex flex-wrap gap-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Micro Empresa" id="enq-1" />
                    <Label htmlFor="enq-1" className="font-normal cursor-pointer">Micro Empresa</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Empresa Pequeno Porte" id="enq-2" />
                    <Label htmlFor="enq-2" className="font-normal cursor-pointer">Empresa Pequeno Porte</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Outros" id="enq-3" />
                    <Label htmlFor="enq-3" className="font-normal cursor-pointer">Outros</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div>
              <p className="font-medium mb-3 text-sm text-slate-800">Clique sobre o nome do orgão para visualizar as opções:</p>
              
              <Accordion type="single" collapsible className="space-y-2">
                <AccordionItem value="junta" className="border rounded-md bg-white">
                  <AccordionTrigger className="px-4 py-3 bg-slate-50 hover:bg-slate-100 hover:no-underline font-medium text-slate-700 data-[state=open]:border-b">
                    Junta Comercial
                  </AccordionTrigger>
                  <AccordionContent className="p-4">
                    <RadioGroup value={orgaoRegistro} onValueChange={setOrgaoRegistro} className="space-y-3">
                      {[
                        "CONSORCIO DE SOCIEDADES",
                        "CONSORCIO SIMPLES",
                        "COOPERATIVA",
                        "COOPERATIVAS DE CONSUMO",
                        "EMPRESA PUBLICA",
                        "EMPRESARIO",
                        "ESTABELECIMENTONO BRASIL EMP.BINAC.ARGENT-BRASIL",
                        "ESTABELECIMENTONO BRASILDE SOCIEDADE ESTRANGEIRA - FILIAL",
                        "GRUPO DE SOCIEDADES",
                        "SOCIEDADE ANONIMA ABERTA",
                        "SOCIEDADE ANONIMA FECHADA",
                        "SOCIEDADE DE ECONOMIA MISTA",
                        "SOCIEDADE EMPRESARIA EM COMANDITA POR ACOES",
                        "SOCIEDADE EMPRESARIA EM COMANDITA SIMPLES",
                        "SOCIEDADE EMPRESARIA EM NOME COLETIVO",
                        "SOCIEDADE EMPRESARIA LIMITADA"
                      ].map((org, idx) => (
                        <div key={`jc-${idx}`} className="flex items-center space-x-2">
                          <RadioGroupItem value={org} id={`jc-${idx}`} />
                          <Label htmlFor={`jc-${idx}`} className="font-normal cursor-pointer">{org}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cartorio" className="border rounded-md bg-white">
                  <AccordionTrigger className="px-4 py-3 bg-slate-50 hover:bg-slate-100 hover:no-underline font-medium text-slate-700 data-[state=open]:border-b">
                    Cartório de Registro de Pessoa Jurídica
                  </AccordionTrigger>
                  <AccordionContent className="p-4">
                    <RadioGroup value={orgaoRegistro} onValueChange={setOrgaoRegistro} className="space-y-3">
                      {[
                        "ASSOCIACAO PRIVADA",
                        "CONSORCIO PUBLICO DE DIREITO PRIVADO",
                        "ENTIDADE DE MEDIACAO E ARBITRAGEM",
                        "ENTIDADE SINDICAL",
                        "ESTABELECIMENTO,NO BRASIL,DE FUNDACAO OU ASSOCIACAO ESTRANGEIRAS",
                        "ESTABELECIMENTONO BRASILDE SOCIEDADE ESTRANGEIRA - FILIAL",
                        "FUNDACAO PRIVADA",
                        "FUNDACAO PUBLICA DE DIREITO PRIVADO ESTADUAL OU DO DISTRITO FEDERAL",
                        "FUNDACAO PUBLICA DE DIREITO PRIVADO FEDERAL",
                        "FUNDACAO PUBLICA DE DIREITO PRIVADO MUNICIPAL",
                        "ORGANIZACAO RELIGIOSA",
                        "ORGANIZACAO SOCIAL",
                        "ORGAO DE DIRECAO NACIONAL DE PARTIDO POLITICO",
                        "SERVICO SOCIAL AUTONOMO",
                        "SOCIEDADE SIMPLES EM COMANDITA SIMPLES",
                        "SOCIEDADE SIMPLES EM NOME COLETIVO",
                        "SOCIEDADE SIMPLES LIMITADA",
                        "SOCIEDADE SIMPLES PURA"
                      ].map((org, idx) => (
                        <div key={`cart-${idx}`} className="flex items-center space-x-2">
                          <RadioGroupItem value={org} id={`cart-${idx}`} />
                          <Label htmlFor={`cart-${idx}`} className="font-normal cursor-pointer">{org}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="oab" className="border rounded-md bg-white">
                  <AccordionTrigger className="px-4 py-3 bg-slate-50 hover:bg-slate-100 hover:no-underline font-medium text-slate-700 data-[state=open]:border-b">
                    OAB
                  </AccordionTrigger>
                  <AccordionContent className="p-4">
                    <RadioGroup value={orgaoRegistro} onValueChange={setOrgaoRegistro} className="space-y-3">
                      {[
                        "SOCIEDADE SIMPLES PURA",
                        "SOCIEDADE UNIPESSOAL DE ADVOCACIA"
                      ].map((org, idx) => (
                        <div key={`oab-${idx}`} className="flex items-center space-x-2">
                          <RadioGroupItem value={org} id={`oab-${idx}`} />
                          <Label htmlFor={`oab-${idx}`} className="font-normal cursor-pointer">{org}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={handleBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 text-white">
          Avançar <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
