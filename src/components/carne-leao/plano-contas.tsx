'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  HelpCircle, 
  RotateCcw, 
  Upload, 
  Plus, 
  ChevronUp, 
  ChevronDown, 
  Edit, 
  Trash2 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

const dedutiveis = [
  { id: '01.00001', desc: 'Água do escritório/consultório' },
  { id: '01.00002', desc: 'Aluguel do escritório/consultório' },
  { id: '01.00003', desc: 'Condomínio do escritório/consultório' },
  { id: '01.00004', desc: 'Contribuições obrigatórias a entidades de classe' },
  { id: '01.00005', desc: 'Cópia e autenticação de documentos' },
  { id: '01.00006', desc: 'Emolumentos pagos a terceiros' },
  { id: '01.00007', desc: 'Energia do escritório/consultório' },
  { id: '01.00008', desc: 'Gás do escritório/consultório' },
  { id: '01.00009', desc: 'IPTU do escritório/consultório quando pago pelo contribuinte' },
  { id: '01.00010', desc: 'ISS' },
  { id: '01.00011', desc: 'Material de conservação e limpeza do escritório/consultório' },
  { id: '01.00012', desc: 'Material de escritório' },
  { id: '01.00013', desc: 'Remuneração paga a terceiros, com vínculo empregatício, INSS e FGTS' },
  { id: '01.00014', desc: 'Telefone do escritório/consultório' },
];

const naoDedutiveis = [
  { id: '01.00001', desc: 'Aplicação de capital' },
  { id: '01.00002', desc: 'Aquisição de computador' },
  { id: '01.00003', desc: 'Aquisição de linha telefônica/aparelho telefônico' },
  { id: '01.00004', desc: 'Aquisição de máquina e equipamento' },
  { id: '01.00005', desc: 'Arrendamento mercantil (leasing) de automóveis, equipamentos e máquinas' },
  { id: '01.00006', desc: 'Carnê-leão pago' },
  { id: '01.00007', desc: 'Combustível' },
  { id: '01.00008', desc: 'Conservação e reforma do imóvel do contribuinte' },
  { id: '01.00009', desc: 'Depreciação de instalações e equipamentos' },
  { id: '01.00010', desc: 'Despesas de locomoção e transporte, salvo de representante comercial autônomo' },
  { id: '01.00011', desc: 'Enciclopédia ou livros/revistas em geral' },
  { id: '01.00012', desc: 'Estacionamento' },
  { id: '01.00013', desc: 'IPTU de imóvel residencial' },
  { id: '01.00014', desc: 'Manutenção do veículo' },
  { id: '01.00015', desc: 'Imposto complementar pago' },
  { id: '01.00016', desc: 'Seguro de vida' },
  { id: '01.00017', desc: 'Seguro de imóvel residencial' },
];

export function PlanoContas() {
  const [activeTab, setActiveTab] = useState('dedutiveis');
  const [expanded, setExpanded] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDesc, setNewDesc] = useState('');

  const currentList = activeTab === 'dedutiveis' ? dedutiveis : naoDedutiveis;
  const nextPrefix = (currentList.length + 1).toString().padStart(5, '0');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[500px] w-full">
      <div className="p-6 flex flex-col space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-normal text-slate-900">Plano de Contas</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-[#1b5fcc] hover:bg-blue-50 font-medium">
              <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
            </Button>
            <Button variant="ghost" className="text-[#1b5fcc] hover:bg-blue-50 font-medium">
              <Upload className="mr-2 h-4 w-4" /> Importar
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full text-[#1b5fcc] hover:bg-blue-50">
              <HelpCircle className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Sub Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex border-b border-gray-200 bg-transparent h-auto p-0 justify-start space-x-6">
            <TabsTrigger 
              value="dedutiveis" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1b5fcc] data-[state=active]:text-[#1b5fcc] data-[state=active]:bg-transparent px-0 py-3 font-semibold text-slate-500 uppercase tracking-wide text-xs"
            >
              DEDUTÍVEIS
            </TabsTrigger>
            <TabsTrigger 
              value="naodedutiveis" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#1b5fcc] data-[state=active]:text-[#1b5fcc] data-[state=active]:bg-transparent px-0 py-3 font-semibold text-slate-500 uppercase tracking-wide text-xs"
            >
              NÃO DEDUTÍVEIS
            </TabsTrigger>
          </TabsList>

          <div className="pt-6 flex justify-end">
            <Button variant="ghost" className="text-slate-600 hover:text-slate-900 font-semibold text-xs">
              <Plus className="mr-1 h-4 w-4" /> GRUPO
            </Button>
          </div>

          {/* Group Accordion */}
          <div className="mt-4">
            <div 
              className="flex items-center justify-between cursor-pointer py-3 px-2 hover:bg-slate-50 transition-colors"
              onClick={() => setExpanded(!expanded)}
            >
              <span className="font-semibold text-slate-700 text-sm">
                01 - Despesas {activeTab === 'dedutiveis' ? 'dedutíveis' : 'não dedutíveis'} - Livro Caixa
              </span>
              {expanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
            </div>

            {expanded && (
              <div className="mt-2 border border-gray-200 rounded-md overflow-hidden">
                {/* Dark Blue Header */}
                <div className="bg-[#0b336e] text-white flex items-center justify-between px-4 py-3">
                  <span className="font-semibold text-sm">
                    Despesas {activeTab === 'dedutiveis' ? 'dedutíveis' : 'não dedutíveis'} - Livro Caixa
                  </span>
                  <div className="flex gap-3">
                    <Edit className="h-4 w-4 cursor-pointer hover:text-blue-200" />
                    <Trash2 className="h-4 w-4 cursor-pointer hover:text-red-300" />
                  </div>
                </div>

                {/* Columns Header */}
                <div className="bg-slate-50 flex items-center px-4 py-3 border-b border-gray-200">
                  <div className="w-[120px] font-bold text-[#0b336e] text-sm">Conta</div>
                  <div className="flex-1 font-bold text-[#0b336e] text-sm">Descrição</div>
                  
                  <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="text-[#0b336e] hover:bg-blue-100 font-bold h-8 text-xs">
                        <Plus className="mr-1 h-4 w-4" /> CONTA
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
                      <DialogHeader className="px-6 py-4 border-b">
                        <DialogTitle className="text-xl font-normal text-slate-700">Adicionar Nova Conta</DialogTitle>
                      </DialogHeader>
                      
                      <div className="p-6 bg-slate-50">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="bg-[#8ba6d1] text-[#0b336e] font-bold px-3 py-2 rounded-md text-sm">
                            {nextPrefix}
                          </div>
                          <Input 
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            placeholder="Informe uma descrição para a nova conta" 
                            className="flex-1 border-2 border-slate-700 focus-visible:ring-0 text-sm h-10 rounded-md"
                          />
                        </div>

                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {currentList.map(item => (
                            <div key={item.id} className="text-[#1b5fcc] text-sm py-1">
                              {item.id} - {item.desc}
                            </div>
                          ))}
                        </div>
                      </div>

                      <DialogFooter className="px-6 py-4 bg-gray-200/50 border-t flex justify-end gap-3 sm:justify-end">
                        <Button 
                          variant="secondary" 
                          onClick={() => setIsAddModalOpen(false)}
                          className="bg-slate-200 text-slate-700 hover:bg-slate-300 font-semibold rounded-full px-6"
                        >
                          DESISTIR
                        </Button>
                        <Button 
                          onClick={() => {
                            setNewDesc('');
                            setIsAddModalOpen(false);
                          }}
                          className="bg-[#1b5fcc] hover:bg-[#154ca3] text-white font-semibold rounded-full px-8"
                        >
                          SALVAR
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Rows */}
                <div className="divide-y divide-gray-100">
                  {currentList.map((item, i) => (
                    <div key={item.id} className={`flex items-center px-4 py-3 hover:bg-blue-50/50 transition-colors ${i % 2 !== 0 ? 'bg-slate-50/50' : ''}`}>
                      <div className="w-[120px] text-slate-600 text-sm">{item.id}</div>
                      <div className="flex-1 text-slate-700 text-sm">{item.desc}</div>
                      <div className="flex gap-4 opacity-70 hover:opacity-100">
                        <Edit className="h-4 w-4 text-[#1b5fcc] cursor-pointer hover:text-blue-800" />
                        <Trash2 className="h-4 w-4 text-[#1b5fcc] cursor-pointer hover:text-red-600" />
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}