import { SimplesNacionalFatorRManager } from "@/components/fiscal/simples-nacional/fator-r-manager";

export default function FatorRPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Fator R Simples Nacional</h3>
        <p className="text-sm text-muted-foreground">
          Consulte e gerencie o Fator R das empresas do Simples Nacional.
        </p>
      </div>
      <SimplesNacionalFatorRManager />
    </div>
  );
}
