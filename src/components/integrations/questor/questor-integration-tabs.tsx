'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestorManager } from '@/components/integrations/questor/questor-manager';
import { QuestorSynManager } from '@/components/integrations/questor/questor-syn-manager';

interface QuestorIntegrationTabsProps {
  synConfig: any;
  synRoutines: any;
  config: any;
  companies: any;
  auths: any;
}

export function QuestorIntegrationTabs({ 
  synConfig, 
  synRoutines, 
  config, 
  companies, 
  auths
}: QuestorIntegrationTabsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Evita mismatch de hidratação renderizando apenas no cliente
  }

  return (
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
  );
}
