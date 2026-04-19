
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Company {
  id: string;
  nome: string;
  razao_social: string;
  cnpj: string;
  code: string | null;
  filial: string | null;
  municipio: string | null;
  uf: string | null;
  data_abertura: string | null;
  telefone: string;
  email_contato: string;
  is_active: number;
  has_movements: number;
}

interface CompanyDetailsDialogProps {
  company: Company;
}

export function CompanyDetailsDialog({ company }: CompanyDetailsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-blue-600 border-blue-600/20 hover:bg-blue-50"
          title="Visualizar Detalhes"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Empresa</DialogTitle>
          <DialogDescription>
            Informações completas sobre {company.razao_social}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Código</span>
            <p className="text-sm font-semibold">{company.code || '-'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Filial</span>
            <p className="text-sm">{company.filial || '-'}</p>
          </div>
          
          <div className="space-y-1 col-span-2">
            <span className="text-sm font-medium text-muted-foreground">Razão Social</span>
            <p className="text-lg font-semibold">{company.razao_social}</p>
          </div>
          
          <div className="space-y-1 col-span-2">
            <span className="text-sm font-medium text-muted-foreground">Nome Fantasia</span>
            <p className="text-base">{company.nome}</p>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">CNPJ/CPF</span>
            <p className="text-sm font-mono">{company.cnpj}</p>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Data de Abertura</span>
            <p className="text-sm">
              {company.data_abertura 
                ? format(new Date(company.data_abertura), 'dd/MM/yyyy', { locale: ptBR })
                : '-'}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Município/UF</span>
            <p className="text-sm">{company.municipio} - {company.uf}</p>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            <div>
              <span className={`px-2 py-1 rounded-full text-xs ${company.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {company.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Email de Contato</span>
            <p className="text-sm">{company.email_contato || '-'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium text-muted-foreground">Telefone</span>
            <p className="text-sm">{company.telefone || '-'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
