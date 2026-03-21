import { InssManager } from "@/components/fiscal/tabela-inss/inss-manager";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function InssPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/fiscal">
          <Button variant="outline" size="icon" className="bg-orange-500 text-white hover:bg-orange-600">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Tabela de INSS</h3>
          <p className="text-sm text-muted-foreground">
            Tabelas de contribuição e regras do INSS vigentes para 2026.
          </p>
        </div>
      </div>
      
      <InssManager />
    </div>
  );
}