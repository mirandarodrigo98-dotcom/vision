"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Info } from "lucide-react";
import { ANEXOS_SIMPLES_NACIONAL } from "@/lib/simples-nacional-anexos";

export function SimplesNacionalAnexosManager() {
  const [vigencia, setVigencia] = useState(true); // true = atual, false = futura/outra se houvesse

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md w-full sm:w-auto">
          <Info className="h-4 w-4 shrink-0" />
          <p>
            Baseado na <strong>Lei Complementar nº 123/2006</strong>, atualizada pela <strong>LCP nº 155/2016</strong>.
            Tabelas válidas para cálculo de alíquota efetiva.
          </p>
        </div>
        <Button 
          variant={vigencia ? "default" : "outline"} 
          className="shrink-0"
          onClick={() => setVigencia(true)}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Vigência Atual (até 31/12/2026)
        </Button>
      </div>

      <Tabs defaultValue="I" className="w-full">
        <TabsList className="w-full sm:w-auto flex flex-wrap h-auto">
          {ANEXOS_SIMPLES_NACIONAL.map((anexo) => (
            <TabsTrigger key={anexo.id} value={anexo.id} className="flex-1 sm:flex-none">
              {anexo.nome}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {ANEXOS_SIMPLES_NACIONAL.map((anexo) => (
          <TabsContent key={anexo.id} value={anexo.id} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{anexo.nome}</CardTitle>
                <CardDescription className="text-sm">
                  {anexo.descricao}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-center w-[100px]">Faixa</TableHead>
                        <TableHead className="text-center">Receita Bruta em 12 Meses (RBT12)</TableHead>
                        <TableHead className="text-center w-[150px]">Alíquota</TableHead>
                        <TableHead className="text-center w-[200px]">Valor a Deduzir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {anexo.faixas.map((faixa) => (
                        <TableRow key={faixa.faixa}>
                          <TableCell className="text-center font-medium">{faixa.faixa}ª Faixa</TableCell>
                          <TableCell className="text-center">
                            {faixa.rbt12Min === 0 
                              ? `Até ${formatCurrency(faixa.rbt12Max)}`
                              : faixa.faixa === 6 
                                ? `De ${formatCurrency(faixa.rbt12Min)} a ${formatCurrency(faixa.rbt12Max)}`
                                : `De ${formatCurrency(faixa.rbt12Min)} a ${formatCurrency(faixa.rbt12Max)}`
                            }
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {formatPercent(faixa.aliquota)}
                          </TableCell>
                          <TableCell className="text-center">
                            {formatCurrency(faixa.deducao)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="mt-6 bg-muted/30 p-4 rounded-md border">
                  <h4 className="font-medium mb-2 text-sm">Como calcular a Alíquota Efetiva?</h4>
                  <p className="text-sm text-muted-foreground">
                    A alíquota efetiva é o resultado da fórmula: <strong>[(RBT12 x Alíquota Nominal) - Parcela a Deduzir] / RBT12</strong>
                  </p>
                  <ul className="list-disc list-inside mt-2 text-sm text-muted-foreground ml-4 space-y-1">
                    <li><strong>RBT12</strong>: Receita Bruta Acumulada nos últimos 12 meses anteriores ao período de apuração.</li>
                    <li><strong>Alíquota Nominal</strong>: Percentual indicado na tabela correspondente à faixa de RBT12.</li>
                    <li><strong>Parcela a Deduzir</strong>: Valor indicado na tabela correspondente à faixa de RBT12.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
