import { SimplesNacionalFaturamentoManager } from "@/components/fiscal/simples-nacional/faturamento-manager";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function FaturamentoPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/fiscal/simples-nacional">
          <Button variant="outline" size="icon" className="bg-orange-500 text-white hover:bg-orange-600 border-orange-500">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h3 className="text-lg font-medium">Faturamento Simples Nacional</h3>
          <p className="text-sm text-muted-foreground">
            Consulte e sincronize o faturamento das empresas do Simples Nacional.
          </p>
        </div>
      </div>
      <SimplesNacionalFaturamentoManager />
    </div>
  );
}
