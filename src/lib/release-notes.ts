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
    version: '1.3.28',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Correção de Falha Interna no Disparo Digisac: O sistema estava encontrando erro ao pesquisar a categoria do contato (Financeiro) no banco de dados SQLite, o que causava interrupção da rotina e disparava a notificação de falha interna. A consulta foi refatorada e a falha não ocorrerá mais.' }
    ]
  },
  {
    version: '1.3.27',
    date: '2026-04-06',
    notes: [
      { module: 'Empresas', description: 'Otimização de Navegação e Layout na Edição de Empresa: O cabeçalho foi ajustado para manter a Razão Social da empresa sempre visível independente da aba navegada, um botão de "Voltar" foi adicionado ao topo e o botão "Cancelar" redundante da parte inferior foi removido.' },
      { module: 'Empresas', description: 'Visibilidade da Importação do Questor SYN: O botão de importação agora é restrito estritamente ao modo de "Nova Empresa", sendo ocultado das telas de edição.' }
    ]
  },
  {
    version: '1.3.26',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Criação do botão "Boleto via Digisac": Permite disparar automaticamente o PDF do boleto com uma mensagem padronizada de cobrança via WhatsApp (Digisac). O sistema localiza o cliente da linha através do CNPJ, varre os contatos daquela empresa e envia para o número associado à categoria "Financeiro".' },
      { module: 'Permissões', description: 'Inclusão do Módulo Financeiro: Agora é possível controlar quais usuários podem "Acessar Cobrança", "Detalhar Título", "Registrar Recebimento", "Visualizar Boleto" e "Enviar Boleto via Digisac" através das telas de Permissões.' }
    ]
  },
  {
    version: '1.3.25',
    date: '2026-04-06',
    notes: [
      { module: 'Empresas', description: 'Correção de erro "Download is not defined" que impedia a edição de empresas. O ícone de importação do Questor não estava sendo referenciado corretamente no componente visual.' }
    ]
  },
  {
    version: '1.3.24',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Botões da Barra Superior Padronizados para Laranja: Todos os botões da listagem ("Detalhar", "Receber" e "Visualizar Boleto") agora seguem a cor laranja primária do sistema para facilitar a localização pelo usuário.' },
      { module: 'Financeiro', description: 'Novo Botão "Receber": Permite registrar a baixa financeira de um único título selecionado. Abre um pop-up em espelho ao Omie, pré-preenchendo a Data, Valor, Conta Corrente (apenas ativas) e inserindo uma Observação padrão de auditoria (Recebimento realizado por ...). Só é habilitado caso o título tenha saldo a receber.' },
      { module: 'Financeiro', description: 'Novo Botão "Detalhar": Permite abrir uma tela de inspeção com os detalhes da conta e listar todos os recebimentos vinculados. Possui os recursos "Registrar Recebimento" (desabilitado se já quitado) e "Cancelar Recebimento" para fazer o estorno no Omie.' }
    ]
  },
  {
    version: '1.3.23',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Nomenclatura do arquivo PDF no ZIP: Boletos baixados em lote agora são nomeados dinamicamente com "Razão Social _ CNPJ _ Nosso Número" para facilitar a identificação local.' }
    ]
  },
  {
    version: '1.3.22',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Remoção do botão de filtro nativo do AG Grid ("linha esquisita"): O componente customizado estava dividindo espaço com o botão padrão, criando uma quebra visual de layout. O botão nativo foi desativado via "suppressFloatingFilterButton".' },
      { module: 'Financeiro', description: 'Estilização perfeita do Filtro Flutuante (DevExtreme UI): O input de texto agora tem bordas sutis e o ícone de funil foi embutido à esquerda na mesma linha, proporcionando a experiência limpa e direta solicitada.' }
    ]
  },
  {
    version: '1.3.21',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Reconstrução total do componente de Filtro Flutuante: Substituído o design nativo complexo por um filtro simples, onde o ícone de funil na esquerda abre o menu de opções ("Começa com", "Contém", etc) e a digitação ocorre livremente à direita, inspirando-se na usabilidade DevExtreme.' },
      { module: 'Financeiro', description: 'Correção crítica no Download em Lote (ZIP): A função backend de bypass de CORS não havia sido acionada corretamente no loop da interface, o que forçava a geração de TXTs. Agora, arquivos .pdf reais são entregues dentro do arquivo compactado.' }
    ]
  },
  {
    version: '1.3.20',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Correção do ZIP de Download: Boletos baixados em lote agora retornam corretamente os arquivos .pdf. Uma rota Server-Side foi implementada para quebrar a limitação de CORS do Omie.' },
      { module: 'Financeiro', description: 'Design do Filtro Flutuante: Restaurada a aparência nativa do filtro com inputs diretamente na coluna e funil à esquerda, consertando o componente anterior que quebrava o estilo do AG Grid.' },
      { module: 'Financeiro', description: 'Sombreado das Linhas: Agora, quando as linhas são marcadas, recebem destaque em laranja claro para melhor acessibilidade.' },
      { module: 'Financeiro', description: 'Aprimoramento do Número de Boleto e Código de Barras: Se essas informações não vierem na listagem padrão, o sistema tentará inferi-las e o botão "Visualizar Boleto" executará uma busca profunda individual (ObterBoleto).' }
    ]
  },
  {
    version: '1.3.19',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Correção crítica: Boletos e códigos de barras que não estavam aparecendo agora são listados corretamente. O Omie oculta os códigos de barras quando o filtro de "Apenas Inclusão" está ativo; o sistema agora força o retorno de todos os dados do boleto.' },
      { module: 'Financeiro', description: 'Visualizar Boleto: Botão "Baixar" foi renomeado de volta para "Visualizar Boleto" e exibe a quantidade selecionada. Quando vários boletos são selecionados, o sistema agora empacota todos em um único arquivo ZIP para download automático.' },
      { module: 'Financeiro', description: 'Design: As linhas selecionadas na tabela agora são destacadas em um tom laranja claro.' }
    ]
  },
  {
    version: '1.3.18',
    date: '2026-04-06',
    notes: [
      { module: 'Financeiro', description: 'Download em Lote: Agora é possível selecionar múltiplos boletos através dos checkboxes e baixar/abrir todos de uma vez.' },
      { module: 'Financeiro', description: 'Filtro Flutuante (Floating Filter): Adicionado o funil de filtro nativo abaixo dos cabeçalhos das colunas.' },
      { module: 'Financeiro', description: 'Tradução pt-BR: Todos os menus de filtro da tabela agora estão em português do Brasil.' },
      { module: 'Financeiro', description: 'Ocultar Colunas: Adicionado o ícone "<<" nos cabeçalhos das colunas para escondê-las. Para reexibir, utilize o botão "Mostrar Colunas" que aparecerá no topo da tabela.' },
      { module: 'Financeiro', description: 'Ajuste de mapeamento: O Número do Boleto agora considera prioridade máxima à numeração estendida ("cNumBancario") e o Tipo de Documento exibe seu nome por extenso (Boleto, Recibo, Dinheiro, etc).' }
    ]
  },
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
