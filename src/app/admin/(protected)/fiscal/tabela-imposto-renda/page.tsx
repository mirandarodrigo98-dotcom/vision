import { ImpostoRendaManager } from "@/components/fiscal/tabela-imposto-renda/imposto-renda-manager";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ImpostoRendaPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/fiscal">
          <Button variant="outline" size="icon" className="bg-orange-500 text-white hover:bg-orange-600">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Tabela de Imposto de Renda</h3>
          <p className="text-sm text-muted-foreground">
            Tabelas de alíquotas e isenções (fonte: SECOM, novas regras 2026).
          </p>
        </div>
      </div>
      
      <ImpostoRendaManager />
    </div>
  );
}
