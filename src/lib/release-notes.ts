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
    version: '1.12.4',
    date: '2026-05-20',
    notes: [
      { module: 'Pessoal', description: 'Históricos permanece com download de anexo disponível na visualização tanto para cliente quanto para adm/operador, seguindo o fluxo com link assinado já gerado pela rotina.' },
      { module: 'Pessoal', description: 'A visualização administrativa de Afastamentos passou a usar a mesma rotina de carregamento que monta o link de download do anexo, liberando o arquivo também para adm/operador.' },
      { module: 'Pessoal', description: 'A visualização de Admissões na área do cliente agora carrega os anexos já enviados e permite baixar cada documento diretamente ao abrir a solicitação.' }
    ]
  },
  {
    version: '1.12.3',
    date: '2026-05-19',
    notes: [
      { module: 'Pessoal', description: 'Admissão agora permite retificação até a própria data da admissão e a tela de retificação passou a exibir os anexos já enviados, permitindo complementar o envio com novos arquivos.' },
      { module: 'Pessoal', description: 'Demissões ganhou o campo Data do Aviso com cálculo automático da Data de Desligamento: aviso trabalhado soma 30 dias e os demais tipos repetem a data do aviso.' },
      { module: 'Pessoal', description: 'As regras de retificação de Demissões foram ajustadas para permitir edição até a data do desligamento, com atualização do PDF e persistência do novo campo notice_date.' }
    ]
  },
  {
    version: '1.11.9',
    date: '2026-05-19',
    notes: [
      { module: 'Pessoal', description: 'Nova rotina de Históricos no módulo Pessoal para cliente e adm/operador, com solicitações de alteração cadastral, salário, cargo, escala, dependentes, vale transporte, benefícios, exames médicos e CAT.' },
      { module: 'Pessoal', description: 'A rotina de Históricos agora conta com permissões próprias, notificações internas no sino, disparo de e-mails por solicitação/retificação/conclusão/cancelamento e blindagem da tabela para funcionar na Vercel mesmo sem runner automático de migration.' },
      { module: 'Imposto de Renda', description: 'A comparação entre declaração anterior e pré-preenchida foi reorganizada para leitura mais clara no formato da declaração, com recuperação do controle visual para ocultar e exibir gráficos.' },
      { module: 'Questor Zen', description: 'Correção do fluxo de lançamento de variáveis para voltar a carregar os eventos corretamente no portal autenticado do Questor Zen.' }
    ]
  },
  {
    version: '1.11.8',
    date: '2026-05-14',
    notes: [
      { module: 'Sistema', description: 'Nova versão publicada para destravar a exibição das novidades do sistema no ambiente de operador e administrador. Como o modal compara pela versão atual, as atualizações voltam a aparecer corretamente após o deploy.' },
      { module: 'Financeiro', description: 'O filtro da cobrança agora permite escolher a busca no Omie por data de emissão ou por data de vencimento, mantendo as duas opções disponíveis nas duas empresas.' },
      { module: 'Imposto de Renda', description: 'O botão de detalhes da declaração (olhinho) agora abre em uma nova aba do navegador, preservando a listagem atual.' }
    ]
  },
  {
    version: '1.11.7',
    date: '2026-05-13',
    notes: [
      { module: 'Variáveis da Folha', description: 'A grade de lançamentos agora exibe cabeçalhos e dados centralizados para melhorar a leitura da listagem.' },
      { module: 'Variáveis da Folha', description: 'Mês Ref. passa a ser mostrado em MM/AAAA, Data de Envio em DD/MM/AAAA HH:mm:ss e Protocolo Zen exibe apenas o ID do protocolo.' }
    ]
  },
  {
    version: '1.11.6',
    date: '2026-05-13',
    notes: [
      { module: 'Questor Zen', description: 'Correção da exibição de descrições de eventos variáveis vindas do portal do Questor Zen, com tratamento adicional de charset para preservar acentuação.' },
      { module: 'Variáveis da Folha', description: 'Nova rotina de lançamento agora exibe botão Cancelar em todas as etapas, retornando diretamente para a grade de Variáveis da Folha.' }
    ]
  },
  {
    version: '1.11.5',
    date: '2026-05-13',
    notes: [
      { module: 'Questor Zen', description: 'Envios de Lançamentos Eventos Variáveis feitos pelo Vision agora preenchem a observação do documento com o texto Importação Vision.' },
      { module: 'Questor Zen', description: 'Ajuste aplicado diretamente no fluxo web autenticado do portal, sem alterar o comportamento validado da Aba 1 e da visualização do cadastro.' }
    ]
  },
  {
    version: '1.11.4',
    date: '2026-05-13',
    notes: [
      { module: 'Questor Zen', description: 'O assunto dos lançamentos de eventos variáveis volta a seguir o original do portal: apenas Lançamentos Eventos Variáveis.' },
      { module: 'Questor Zen', description: 'A busca de eventos/variáveis agora usa primeiro o próprio portal do Questor Zen e mantém a consulta personalizada apenas como fallback, reduzindo o tempo de resposta quando o Zen responde normalmente.' }
    ]
  },
  {
    version: '1.11.3',
    date: '2026-05-13',
    notes: [
      { module: 'Questor Zen', description: 'Novo alinhamento do fluxo web de Lançamentos de Eventos Variáveis com o payload manual do portal, incluindo contexto oculto de categoria e campos persistidos do formulário.' },
      { module: 'Questor Zen', description: 'Correção adicional para visualização do cadastro no portal após envio pelo Vision, ajustando o uso de REFERVALOR, VALOREVENTO e campos de contexto do formulário.' }
    ]
  },
  {
    version: '1.11.2',
    date: '2026-05-13',
    notes: [
      { module: 'Questor Zen', description: 'Correção do envio web de Lançamentos de Eventos Variáveis para preservar a visualização do cadastro no portal após o envio pelo Vision.' },
      { module: 'Questor Zen', description: 'O payload agora separa corretamente os dados salvos do formulário e a grade exibida no portal, alinhando o comportamento com o fluxo manual do Zen.' }
    ]
  },
  {
    version: '1.11.1',
    date: '2026-05-13',
    notes: [
      { module: 'Sistema', description: 'Correção no modal de atualizações: as novidades voltam a aparecer corretamente ao abrir o sistema, incluindo as versões mais recentes.' },
      { module: 'Sistema', description: 'A comparação de versões agora considera a versão completa, evitando falhas ao decidir quais novidades devem ser exibidas.' }
    ]
  },
  {
    version: '1.11.0',
    date: '2026-05-13',
    notes: [
      { module: 'Questor Zen', description: 'Meu Perfil do usuário cliente agora exibe os campos Usuário, Senha e Token do Questor Zen, usando exatamente os mesmos dados do cadastro administrativo.' },
      { module: 'Questor Zen', description: 'Sincronização bidirecional: qualquer alteração feita no Meu Perfil reflete no cadastro do usuário cliente no painel administrativo, e vice-versa.' },
      { module: 'Cadastros', description: 'Novo botão de Histórico no cadastro do usuário cliente para acompanhar alterações dos campos do Questor Zen sem expor a senha em texto puro.' }
    ]
  },
  {
    version: '1.10.0',
    date: '2026-05-12',
    notes: [
      { module: 'Questor Zen', description: 'Adicionada a seção Questor Zen no cadastro do usuário cliente com os campos Usuário, Senha e Token para autenticação no portal.' },
      { module: 'Pessoal', description: 'Lançamentos de Eventos Variáveis passam a usar o fluxo web autenticado do Questor Zen, alinhado ao comportamento necessário para integração com a Aba 1 do Desktop.' }
    ]
  },
  {
    version: '1.8.0',
    date: '2026-04-29',
    notes: [
      { module: 'Vale Transporte', description: 'Novo módulo de Vale Transporte! Agora clientes podem solicitar e gerenciar vales de transporte diretamente pelo sistema (em Pessoal > Vale Transporte).' },
      { module: 'Vale Transporte', description: 'Criação de interface para acompanhamento de vales aprovados e cancelados.' },
      { module: 'Vale Transporte', description: 'Disparo automático de e-mails com resumo em PDF dos pedidos criados para acompanhamento e controle.' },
      { module: 'Permissões', description: 'Adicionada chave mestre ("selecionar todos") no assistente de clientes para ativar/desativar todas as permissões de uma categoria com apenas um clique.' },
      { module: 'Sistema', description: 'Remoção definitiva de resquícios do banco de dados SQLite, melhorando o desempenho e evitando problemas de sintaxe no servidor.' },
      { module: 'Sistema', description: 'Correção de segurança no login: Resolvido o "Application error" causado por bloqueios de cookies ou localStorage restrito nos navegadores.' }
    ]
  },
  {
    version: '1.3.38',
    date: '2026-04-09',
    notes: [
      { module: 'Imposto de Renda', description: 'Correção do Histórico: Resolvido o bug em que o status ficava como "null" no histórico da declaração quando alterado para Transmitida.' },
      { module: 'Financeiro', description: 'Novidades em Cobrança: O envio do boleto via Digisac agora varre a categoria de contato "Todas" além da "Financeiro". Adicionado também o novo botão "Enviar Cobrança", exclusivo para títulos com status ATRASADO, enviando uma mensagem formal de alerta de débito via WhatsApp.' }
    ]
  },
  {
    version: '1.3.37',
    date: '2026-04-09',
    notes: [
      { module: 'Imposto de Renda', description: 'Otimização da Transmissão de IRPF: Agora o modal de Transmissão permite inserir opcionalmente o valor de restituição (que só aparece se o usuário anexar um arquivo contendo a palavra "imagem-recibo" no nome). A mensagem oficial enviada para os contribuintes também foi polida para um tom mais profissional ("Mensagem automática"), exibindo condicionalmente o valor da restituição preenchido.' }
    ]
  },
  {
    version: '1.3.36',
    date: '2026-04-09',
    notes: [
      { module: 'Imposto de Renda', description: 'Correção no Envio de E-mails e WhatsApp da Transmissão: Foi corrigido um bug que impedia o disparo de e-mails com os anexos da declaração devido à falha de resolução do módulo de e-mail. No WhatsApp, corrigimos a injeção indevida da assinatura "NZD:" nos PDFs que eram enviados sem texto, além de esclarecer que o envio ocorre de forma sequencial (uma mensagem por PDF) devido às restrições nativas do próprio WhatsApp para o envio de mídias via API.' }
    ]
  },
  {
    version: '1.3.35',
    date: '2026-04-09',
    notes: [
      { module: 'Imposto de Renda', description: 'Novo fluxo de Transmissão de IRPF: Ao alterar o status para "Transmitida", o sistema solicita o anexo da declaração em PDF (com validação estrita do nome do arquivo contendo CPF e Ano). Também permite enviar o PDF anexado diretamente para o WhatsApp e E-mail do contribuinte usando o módulo Digisac, garantindo agilidade na comunicação.' }
    ]
  },
  {
    version: '1.3.34',
    date: '2026-04-09',
    notes: [
      { module: 'Financeiro', description: 'Correção Definitiva de Arquivo Corrompido no Digisac: O PDF do boleto que chegava ao cliente estava vindo corrompido porque a API do Digisac exigia secretamente a declaração explícita "data:application/pdf;base64," junto ao código do arquivo. Isso foi corrigido no payload de upload.' }
    ]
  },
  {
    version: '1.3.32',
    date: '2026-04-09',
    notes: [
      { module: 'Financeiro', description: 'Correção de Nomenclatura e Integridade de PDF no Digisac: O nome do arquivo enviado pelo WhatsApp agora respeita a nomenclatura original do Omie, em vez do genérico "boleto.pdf", e foram corrigidos os parâmetros de mimetype e extensão para garantir que o PDF possa ser aberto corretamente pelo destinatário.' }
    ]
  },
  {
    version: '1.3.31',
    date: '2026-04-09',
    notes: [
      { module: 'Financeiro', description: 'Correção Crítica no Disparo Digisac: Ajuste na estrutura da integração com a API do WhatsApp. O sistema agora faz o upload antecipado do PDF do boleto para a nuvem do Digisac, obtém um ID válido, e envia na mesma mensagem junto ao texto, resolvendo o problema onde apenas o texto chegava ao destinatário.' }
    ]
  },
  {
    version: '1.3.30',
    date: '2026-04-09',
    notes: [
      { module: 'Financeiro', description: 'Correção de Envio de Arquivo Digisac: O boleto não estava sendo anexado à mensagem no WhatsApp pois a API do Digisac esperava o arquivo em formato Base64 ou URL com metadados específicos. A rotina foi reescrita para realizar o download em memória do PDF no Omie, converter para Base64 e enviar embutido com a legenda, garantindo a entrega do documento físico.' }
    ]
  },
  {
    version: '1.3.29',
    date: '2026-04-09',
    notes: [
      { module: 'Financeiro', description: 'Correção de Falha Interna no Disparo Digisac: Ajuste na sintaxe da consulta ao banco de dados (correção de aspas duplas para simples no comando REPLACE) e inclusão da importação correta das configurações do Digisac, garantindo que o boleto seja enviado com sucesso via WhatsApp.' }
    ]
  },
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

function parseVersion(version: string | null | undefined) {
  const parts = String(version || '')
    .split('.')
    .map((part) => Number.parseInt(part, 10));

  return [
    Number.isFinite(parts[0]) ? parts[0] : 0,
    Number.isFinite(parts[1]) ? parts[1] : 0,
    Number.isFinite(parts[2]) ? parts[2] : 0,
  ] as const;
}

function compareVersions(a: string | null | undefined, b: string | null | undefined) {
  const left = parseVersion(a);
  const right = parseVersion(b);

  for (let i = 0; i < 3; i++) {
    if (left[i] > right[i]) return 1;
    if (left[i] < right[i]) return -1;
  }

  return 0;
}

// Helper to determine if we should show notes
export function shouldShowReleaseNotes(currentVersion: string, lastSeenVersion: string | null): boolean {
  if (!lastSeenVersion || typeof lastSeenVersion !== 'string') return true;

  return compareVersions(currentVersion, lastSeenVersion) > 0;
}

// Helper to get notes to show
export function getNotesToShow(lastSeenVersion: string | null): ReleaseNote[] {
  if (!lastSeenVersion || typeof lastSeenVersion !== 'string') {
    return RELEASE_NOTES.filter(note => compareVersions(note.version, '0.0.0') > 0);
  }

  return RELEASE_NOTES.filter(note => {
    return compareVersions(note.version, lastSeenVersion) > 0;
  });
}
