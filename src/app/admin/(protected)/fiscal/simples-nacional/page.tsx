import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReceiptText } from "lucide-react";

export default function SimplesNacionalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Área de Trabalho do Simples Nacional</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie as rotinas e integrações do Simples Nacional.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5" />
              Faturamento por Empresa
            </CardTitle>
            <CardDescription>
              Visualize e sincronize o faturamento das empresas do Simples Nacional via Questor SYN.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/admin/fiscal/simples-nacional/faturamento">
              <Button className="w-full">Acessar Faturamento</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
