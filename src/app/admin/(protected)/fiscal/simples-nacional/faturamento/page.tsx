import { SimplesNacionalFaturamentoManager } from "@/components/fiscal/simples-nacional/faturamento-manager";

export default function FaturamentoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Faturamento Simples Nacional</h3>
        <p className="text-sm text-muted-foreground">
          Consulte e sincronize o faturamento das empresas do Simples Nacional.
        </p>
      </div>
      <SimplesNacionalFaturamentoManager />
    </div>
  );
}
