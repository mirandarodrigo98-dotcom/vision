'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestorManager } from '@/components/integrations/questor/questor-manager';
import { QuestorSynManager } from '@/components/integrations/questor/questor-syn-manager';
import { QuestorZenManager } from '@/components/integrations/questor/questor-zen-manager';

interface QuestorIntegrationTabsProps {
  synConfig: any;
  synRoutines: any;
  config: any;
  companies: any;
  auths: any;
  zenConfig: any;
}

export function QuestorIntegrationTabs({ 
  synConfig, 
  synRoutines, 
  config, 
  companies, 
  auths,
  zenConfig
}: QuestorIntegrationTabsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Evita mismatch de hidratação renderizando apenas no cliente
  }

  return (
    <Tabs defaultValue="zen" className="w-full">
      <TabsList>
          <TabsTrigger value="zen">Questor Zen (Novo)</TabsTrigger>
          <TabsTrigger value="syn">nWeb (SYN Privado)</TabsTrigger>
          <TabsTrigger value="legacy">Integração Cloud (Legado)</TabsTrigger>
      </TabsList>
      
      <TabsContent value="zen" className="mt-4">
          <QuestorZenManager initialConfig={zenConfig} />
      </TabsContent>

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
  );
}
