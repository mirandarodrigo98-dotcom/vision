export interface ReleaseNoteItem {
  module: string;
  description: string;
}

export interface ReleaseNote {
  version: string;
  date: string;
  notes: ReleaseNoteItem[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: '1.3.17',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Inserido a nova coluna "Código de Barras" na listagem de Contas a Receber.' },
      { module: 'Financeiro', description: 'Correção na exibição do Número do Boleto (ajuste de hierarquia na resposta do Omie).' },
      { module: 'Financeiro', description: 'Adicionada caixa de seleção em cada linha e botão "Visualizar Boleto" para download/impressão direta do PDF via integração nativa Omie.' }
    ]
  },
  {
    version: '1.3.16',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Revisão profunda no mapeamento de dados do Omie: Razão Social, Contas Correntes e Categorias agora exibem descrições e não IDs.' },
      { module: 'Financeiro', description: 'Correção de valores recebidos: Contas recebidas/liquidadas agora refletem corretamente os valores, datas de pagamento, descontos e multas na tabela.' },
      { module: 'Financeiro', description: 'Formatação de moeda atualizada (sem o prefixo R$) para facilitar leitura no grid avançado.' }
    ]
  },
  {
    version: '1.3.15',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Correção crítica: A tabela (AG Grid) estava renderizando em branco após atualização do sistema. Inserido o registro obrigatório de módulos da versão mais recente da biblioteca.' }
    ]
  },
  {
    version: '1.3.14',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Removida flag "exibir_resumo" do payload Omie. A API considerava a tag inválida, impedindo a busca de registros.' }
    ]
  },
  {
    version: '1.3.13',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Otimização completa do grid de Contas a Receber (Omie): Implementado o AG Grid para ordenação, filtros robustos, redimensionamento de colunas e ocultação.' },
      { module: 'Financeiro', description: 'Correção de mapeamentos: A Razão Social, Categoria e Nome do Banco agora são exibidos corretamente via cruzamento de dados com APIs auxiliares do Omie.' },
      { module: 'Financeiro', description: 'Formatação de valores aprimorada e cálculo correto para data do último pagamento, juros, descontos, valor recebido e a receber.' }
    ]
  },
  {
    version: '1.3.12',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Correção de erro de renderização do grid de Contas a Receber (React error #31). A coluna de número do boleto agora é formatada corretamente.' }
    ]
  },
  {
    version: '1.3.11',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Correção de mapeamento no payload de consulta do Omie: os filtros de data agora funcionam corretamente utilizando o padrão [filtrar_por_data_de] exigido pela API.' }
    ]
  },
  {
    version: '1.3.10',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Correção do erro na tela de Cobrança. Melhorado o tratamento de respostas da API Omie quando nenhum boleto é encontrado para o período.' }
    ]
  },
  {
    version: '1.3.9',
    date: '2026-04-06',
    notes: [
      { module: 'Integrações', description: 'Novo menu de configuração Omie! Agora é possível inserir as chaves da API diretamente pela interface do sistema sem depender de suporte técnico.' },
      { module: 'Financeiro', description: 'O painel de Cobrança do Omie agora utiliza as chaves cadastradas em tempo real pelo administrador no menu Integrações.' }
    ]
  },
  {
    version: '1.3.8',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Novo Módulo de Contas a Receber! Integração via API com Omie ERP. Consulta com filtro por período de emissão e tabela analítica de liquidação/inadimplência (substitui integração direta Itaú).' }
    ]
  },
  {
    version: '1.3.7',
    date: '2026-04-06',
    notes: [
      { module: 'Navegação', description: 'Remoção de menus expansivos da barra lateral a pedido. Agora Cadastro, Pessoal, Contabilidade, Financeiro e Integrações abrem em painéis próprios com botões (estilo Fiscal).' },
      { module: 'Financeiro', description: 'Correção de visibilidade: Módulo Financeiro agora aparece corretamente para usuários administradores com permissão.' }
    ]
  },
  {
    version: '1.3.6',
    date: '2026-04-06',
    notes: [
      { module: 'Imposto de Renda', description: 'Correção da barra de rolagem horizontal nos comentários do Imposto de Renda. Agora o texto longo quebra automaticamente.' },
      { module: 'Imposto de Renda', description: 'Registro de histórico automático (exclusão, edição, recebimentos, alteração de status) agora reflete corretamente dentro da timeline do chat.' },
      { module: 'Financeiro', description: 'Nova área de Cobrança Financeira adicionada à barra lateral (Menu).' },
      { module: 'Navegação', description: 'Menu lateral reformulado: Pessoal, Cadastro e Contabilidade agora se comportam como o menu Fiscal (abertura em árvore).' }
    ]
  },
  {
    version: '1.3.5',
    date: '2026-04-06',
    notes: [
      { module: 'Segurança', description: 'Implementado sistema robusto de Rate Limiting para prevenir ataques de força bruta no Login e OTP.' },
      { module: 'Segurança', description: 'Adicionados novos cabeçalhos HTTP (Security Headers) no servidor para impedir clickjacking e sniffing.' },
      { module: 'Segurança', description: 'Reforço nas defesas contra falsificação de solicitações (CSRF) em operações do sistema.' }
    ]
  },
  {
    version: '1.3.4',
    date: '2026-04-06',
    notes: [
      { module: 'Integrações', description: 'Correção de um erro em que funcionários já existentes não eram processados corretamente durante a importação em lote do Questor SYN.' },
      { module: 'Sistema', description: 'Otimização nas transações de banco de dados para garantir atomicidade total em cadastros críticos.' }
    ]
  },
  {
    version: '1.3.0',
    date: '2026-03-31',
    notes: [
      { module: 'Imposto de Renda', description: 'Implementado novo sistema de filtros avançados (nome, cpf, prioridade, tipo, status e recebimento).' },
      { module: 'Sistema', description: 'Adicionado sistema de Release Notes para informar os usuários sobre novas atualizações.' }
    ]
  },
  {
    version: '1.2.5',
    date: '2026-03-31',
    notes: [
      { module: 'Chamados', description: 'Correção na exibição do nome da empresa vinculada ao chamado nos detalhes do chamado e listagem.' }
    ]
  },
  {
    version: '1.2.4',
    date: '2026-03-31',
    notes: [
      { module: 'Imposto de Renda', description: 'Inclusão de máscara com formatação brasileira no campo de Valor do Serviço.' },
      { module: 'Imposto de Renda', description: 'Ajuste no sistema de geração de recibos e correção de erro na exclusão.' },
      { module: 'Imposto de Renda', description: 'Adicionado botão de exclusão de declaração para administradores.' }
    ]
  }
];

// Helper to determine if we should show notes
export function shouldShowReleaseNotes(currentVersion: string, lastSeenVersion: string | null): boolean {
  if (!lastSeenVersion) return true;
  
  const [currMajor, currMinor] = currentVersion.split('.').map(Number);
  const [seenMajor, seenMinor] = lastSeenVersion.split('.').map(Number);
  
  if (currMajor > seenMajor) return true;
  if (currMajor === seenMajor && currMinor > seenMinor) return true;
  
  return false;
}

// Helper to get notes to show
export function getNotesToShow(lastSeenVersion: string | null): ReleaseNote[] {
  if (!lastSeenVersion) return RELEASE_NOTES;
  
  const [seenMajor, seenMinor] = lastSeenVersion.split('.').map(Number);
  
  return RELEASE_NOTES.filter(note => {
    const [noteMajor, noteMinor] = note.version.split('.').map(Number);
    if (noteMajor > seenMajor) return true;
    if (noteMajor === seenMajor && noteMinor > seenMinor) return true;
    return false;
  });
}
