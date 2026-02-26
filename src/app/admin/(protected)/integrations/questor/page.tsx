import { Metadata } from 'next';
import { getCompanies } from '@/app/actions/companies';
import { getQuestorConfig } from '@/app/actions/integrations/questor';
import { getQuestorSynConfig, getQuestorSynRoutines } from '@/app/actions/integrations/questor-syn';
import db from '@/lib/db';
import { QuestorManager } from '@/components/integrations/questor/questor-manager';
import { QuestorSynManager } from '@/components/integrations/questor/questor-syn-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata: Metadata = {
  title: 'Integração Questor | Admin',
};

async function getQuestorAuths() {
  const result = await db.prepare('SELECT * FROM questor_company_auth').all();
  return result;
}

export default async function QuestorIntegrationPage() {
  const [companiesResult, config, auths, synConfig, synRoutines] = await Promise.all([
    getCompanies(),
    getQuestorConfig(),
    getQuestorAuths(),
    getQuestorSynConfig(),
    getQuestorSynRoutines(),
  ]);

  const companies = companiesResult || [];

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Integração Questor</h1>
      </div>
      
      <Tabs defaultValue="syn" className="w-full">
        <TabsList>
            <TabsTrigger value="syn">nWeb (SYN Privado)</TabsTrigger>
            <TabsTrigger value="legacy">Integração Cloud (Legado)</TabsTrigger>
        </TabsList>
        
        <TabsContent value="syn" className="mt-4">
            <QuestorSynManager 
                initialConfig={synConfig} 
                initialRoutines={synRoutines} 
            />
        </TabsContent>

        <TabsContent value="legacy" className="mt-4">
            <QuestorManager 
                initialConfig={config} 
                companies={companies}
                companyAuths={auths}
            />
        </TabsContent>
      </Tabs>
    </div>
  );
}
