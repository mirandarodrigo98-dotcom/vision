import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryManager } from "@/components/integrations/enuves/category-manager";
import { getCategories, getAccounts } from "@/app/actions/integrations/enuves";
import { getCompanyDetails } from "@/app/actions/integrations/companies";
import { EnuvesCompanySelector } from "@/components/integrations/enuves/company-selector";
import { EnuvesHeader } from "@/components/integrations/enuves/enuves-header";
import { TransactionsManager } from "@/components/integrations/enuves/transactions-manager";
import { AccountsManager } from "@/components/integrations/enuves/accounts-manager";

interface EnuvesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EnuvesPage({ searchParams }: EnuvesPageProps) {
  const resolvedSearchParams = await searchParams;
  const companyId = typeof resolvedSearchParams.company_id === 'string' ? resolvedSearchParams.company_id : null;

  // If no company selected, show selector
  if (!companyId) {
    return (
      <div className="container mx-auto py-10">
        <EnuvesCompanySelector />
      </div>
    );
  }

  // Fetch company details
  const company = await getCompanyDetails(companyId);
  if (!company) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h2 className="text-xl font-semibold text-red-600">Empresa não encontrada</h2>
        <p className="text-muted-foreground mt-2">A empresa selecionada não existe ou não está ativa.</p>
        <div className="mt-4">
          <EnuvesCompanySelector />
        </div>
      </div>
    );
  }

  // Fetch data for the tabs
  const categories = await getCategories(companyId);
  const accounts = await getAccounts(companyId);

  return (
    <div className="container mx-auto py-6">
      <EnuvesHeader company={company} />
      
      <Tabs defaultValue="categorias" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="contas">Contas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="categorias" className="mt-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-2xl font-bold mb-6">Cadastro de Categorias</h2>
                <CategoryManager initialCategories={categories} companyId={companyId} />
            </div>
        </TabsContent>
        
        <TabsContent value="lancamentos" className="mt-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <TransactionsManager companyId={companyId} />
            </div>
        </TabsContent>
        
        <TabsContent value="contas" className="mt-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-2xl font-bold mb-6">Cadastro de Contas</h2>
                <AccountsManager initialAccounts={accounts} companyId={companyId} />
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
