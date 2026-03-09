import { Metadata } from 'next';
import { getCompanies } from '@/app/actions/companies';
import { getQuestorConfig } from '@/app/actions/integrations/questor';
import { getQuestorSynConfig, getQuestorSynRoutines } from '@/app/actions/integrations/questor-syn';
import { getQuestorZenConfig } from '@/app/actions/integrations/questor-zen';
import db from '@/lib/db';
import { QuestorManager } from '@/components/integrations/questor/questor-manager';
import { QuestorSynManager } from '@/components/integrations/questor/questor-syn-manager';
import { QuestorIntegrationTabs } from '@/components/integrations/questor/questor-integration-tabs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata: Metadata = {
  title: 'Integração Questor | Admin',
};

async function getQuestorAuths() {
  const result = await db.prepare('SELECT * FROM questor_company_auth').all();
  return result;
}

export default async function QuestorIntegrationPage() {
  const [companiesResult, config, auths, synConfig, synRoutines, zenConfig] = await Promise.all([
    getCompanies(),
    getQuestorConfig(),
    getQuestorAuths(),
    getQuestorSynConfig(),
    getQuestorSynRoutines(),
    getQuestorZenConfig(),
  ]);

  const companies = companiesResult || [];

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Integração Questor</h1>
      </div>
      
      <QuestorIntegrationTabs 
        synConfig={synConfig}
        synRoutines={synRoutines}
        config={config}
        companies={companies}
        auths={auths}
        zenConfig={zenConfig}
      />
    </div>
  );
}
