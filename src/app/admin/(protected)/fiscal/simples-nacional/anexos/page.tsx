import { SimplesNacionalAnexosManager } from "@/components/fiscal/simples-nacional/anexos-manager";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AnexosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/fiscal/simples-nacional">
            <Button variant="outline" size="icon" className="bg-orange-500 text-white hover:bg-orange-600 border-orange-500">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h3 className="text-lg font-medium">Anexos do Simples Nacional</h3>
            <p className="text-sm text-muted-foreground">
              Tabelas de alíquotas e faixas de faturamento (LC 123/2006).
            </p>
          </div>
        </div>
        <div>
          <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-50">
            Vigência atual (até 31/12/2026)
          </Button>
        </div>
      </div>
      <SimplesNacionalAnexosManager />
    </div>
  );
}
