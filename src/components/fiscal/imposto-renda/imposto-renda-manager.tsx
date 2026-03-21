"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IR_2026 } from "@/lib/imposto-renda";

export function ImpostoRendaManager() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tabelas do Imposto de Renda 2026</CardTitle>
          <CardDescription>
            Tabelas e faixas de contribuição conforme novas regras para isenção até R$ 5.000,00.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mensal" className="w-full">
            <TabsList className="mb-4 flex flex-wrap h-auto">
              <TabsTrigger value="mensal">Tabela Mensal</TabsTrigger>
              <TabsTrigger value="anual">Tabela Anual</TabsTrigger>
              <TabsTrigger value="isencao_mensal">Isenção e Redução (Mensal)</TabsTrigger>
              <TabsTrigger value="isencao_anual">Isenção e Redução (Anual)</TabsTrigger>
              <TabsTrigger value="irpfm">IRPFM</TabsTrigger>
            </TabsList>
            
            <TabsContent value="mensal">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Base de Cálculo (R$)</TableHead>
                      <TableHead className="text-center">Alíquota (%)</TableHead>
                      <TableHead className="text-center">Parcela a Deduzir (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {IR_2026.mensalTabela.map((faixa, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-center">
                          {faixa.baseMin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - {faixa.baseMax === Infinity ? "Acima" : faixa.baseMax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          {faixa.aliquota > 0 ? `${faixa.aliquota.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%` : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {faixa.deducao > 0 ? faixa.deducao.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="anual">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Base de Cálculo (R$)</TableHead>
                      <TableHead className="text-center">Alíquota (%)</TableHead>
                      <TableHead className="text-center">Parcela a Deduzir (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {IR_2026.anualTabela.map((faixa, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-center">
                          {faixa.baseMin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - {faixa.baseMax === Infinity ? "Acima" : faixa.baseMax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          {faixa.aliquota > 0 ? `${faixa.aliquota.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%` : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {faixa.deducao > 0 ? faixa.deducao.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="isencao_mensal">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Faixa de Renda Mensal (R$)</TableHead>
                      <TableHead className="text-center">Fórmula de Redução / Regra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {IR_2026.mensalIsencao.map((faixa, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-center">
                          {faixa.rendaMin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - {faixa.rendaMax === Infinity ? "Acima" : faixa.rendaMax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">{faixa.reducaoFormula}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="isencao_anual">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Faixa de Renda Anual (R$)</TableHead>
                      <TableHead className="text-center">Fórmula de Redução / Regra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {IR_2026.anualIsencao.map((faixa, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-center">
                          {faixa.rendaMin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - {faixa.rendaMax === Infinity ? "Acima" : faixa.rendaMax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">{faixa.reducaoFormula}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="irpfm">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Faixa de Renda Anual (R$)</TableHead>
                      <TableHead className="text-center">Alíquota Efetiva Mínima (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-center">Acima de 600.000,00</TableCell>
                      <TableCell className="text-center">{IR_2026.irpfmAlíquotas["acima600000"]}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-center">Acima de 1.200.000,00</TableCell>
                      <TableCell className="text-center">{IR_2026.irpfmAlíquotas["acima1200000"]}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                * O IRPFM (Imposto de Renda da Pessoa Física Mínimo) garante que quem ganha acima desses valores pague no mínimo as alíquotas efetivas estipuladas.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
