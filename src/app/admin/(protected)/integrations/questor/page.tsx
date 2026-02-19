import { Metadata } from 'next';
import { getCompanies } from '@/app/actions/companies';
import { getQuestorConfig } from '@/app/actions/integrations/questor';
import db from '@/lib/db';
import { QuestorManager } from '@/components/integrations/questor/questor-manager';

export const metadata: Metadata = {
  title: 'Integração Questor | Admin',
};

async function getQuestorAuths() {
  const result = await db.prepare('SELECT * FROM questor_company_auth').all();
  return result;
}

export default async function QuestorIntegrationPage() {
  const [companiesResult, config, auths] = await Promise.all([
    getCompanies(),
    getQuestorConfig(),
    getQuestorAuths(),
  ]);

  const companies = companiesResult || [];

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Integração Questor</h1>
      </div>
      
      <QuestorManager 
        initialConfig={config} 
        companies={companies}
        companyAuths={auths}
      />
    </div>
  );
}
