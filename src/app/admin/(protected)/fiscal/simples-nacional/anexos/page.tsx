import { SimplesNacionalAnexosManager } from "@/components/fiscal/simples-nacional/anexos-manager";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AnexosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/fiscal/simples-nacional">
          <Button variant="outline" size="icon">
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
      <SimplesNacionalAnexosManager />
    </div>
  );
}
