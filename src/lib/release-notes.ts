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
