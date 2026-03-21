"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INSS_2026 } from "@/lib/inss";

export function InssManager() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tabela de INSS 2026</CardTitle>
          <CardDescription>
            Faixas de contribuição e alíquotas do INSS para 2026 (Portaria Interministerial MPS/MF Nº 13).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="empregado" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="empregado">Empregado (Progressivo)</TabsTrigger>
              <TabsTrigger value="individual">Contribuinte Individual (Pró-labore/MEI)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="empregado">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Faixa</TableHead>
                      <TableHead className="text-center">Salário de Contribuição (R$)</TableHead>
                      <TableHead className="text-center">Alíquota (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {INSS_2026.progressiva.map((faixa, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-center">{faixa.faixa}ª Faixa</TableCell>
                        <TableCell className="text-center">
                          {faixa.baseMin === 0 ? 'Até ' : `De ${faixa.baseMin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} até `}
                          {faixa.baseMax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          {faixa.aliquota.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                * As alíquotas são progressivas. O cálculo é feito aplicando a alíquota sobre a parcela do salário que se enquadra em cada faixa.
              </p>
            </TabsContent>

            <TabsContent value="individual">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">Categoria</TableHead>
                      <TableHead className="text-center">Salário de Contribuição (R$)</TableHead>
                      <TableHead className="text-center">Alíquota (%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-center">Contribuinte Individual (Pró-labore) - Plano Simplificado</TableCell>
                      <TableCell className="text-center">
                        Até {INSS_2026.contribuinteIndividual.teto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">{INSS_2026.contribuinteIndividual.aliquotaSimplificada}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-center">Contribuinte Individual - Padrão</TableCell>
                      <TableCell className="text-center">
                        {INSS_2026.contribuinteIndividual.salarioMinimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a {INSS_2026.contribuinteIndividual.teto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">{INSS_2026.contribuinteIndividual.aliquotaPadrao}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-center">MEI / Facultativo Baixa Renda</TableCell>
                      <TableCell className="text-center">
                        {INSS_2026.contribuinteIndividual.salarioMinimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">{INSS_2026.contribuinteIndividual.aliquotaMEI}%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}