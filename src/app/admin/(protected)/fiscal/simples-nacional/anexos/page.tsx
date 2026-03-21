import { SimplesNacionalAnexosManager } from "@/components/fiscal/simples-nacional/anexos-manager";

export default function AnexosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Anexos do Simples Nacional</h3>
        <p className="text-sm text-muted-foreground">
          Tabelas de alíquotas e faixas de faturamento (LC 123/2006).
        </p>
      </div>
      <SimplesNacionalAnexosManager />
    </div>
  );
}
