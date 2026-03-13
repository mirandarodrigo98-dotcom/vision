export interface Permission {
    code: string;
    label: string;
    description?: string;
    category: string;
    module: string; // New field for grouping
}

export const AVAILABLE_PERMISSIONS: Permission[] = [
    // --- Cadastros ---
    { code: 'companies.view', label: 'Visualizar Empresas', category: 'Empresas', module: 'Cadastros' },
    { code: 'companies.create', label: 'Cadastrar Empresa', category: 'Empresas', module: 'Cadastros' },
    { code: 'companies.edit', label: 'Editar Empresa', category: 'Empresas', module: 'Cadastros' },
    { code: 'companies.delete', label: 'Excluir Empresa', category: 'Empresas', module: 'Cadastros' },

    { code: 'employees.view', label: 'Visualizar Funcionários', category: 'Funcionários', module: 'Cadastros' },
    { code: 'employees.create', label: 'Cadastrar Funcionário', category: 'Funcionários', module: 'Cadastros' },
    { code: 'employees.edit', label: 'Editar Funcionários', category: 'Funcionários', module: 'Cadastros' },
    { code: 'employees.delete', label: 'Excluir Funcionários', category: 'Funcionários', module: 'Cadastros' },

    { code: 'socios.view', label: 'Visualizar Sócios', category: 'Sócios', module: 'Cadastros' },
    { code: 'socios.create', label: 'Cadastrar Sócio', category: 'Sócios', module: 'Cadastros' },
    { code: 'socios.edit', label: 'Editar Sócio', category: 'Sócios', module: 'Cadastros' },
    { code: 'socios.delete', label: 'Excluir Sócio', category: 'Sócios', module: 'Cadastros' },

    { code: 'clients.view', label: 'Visualizar Clientes', category: 'Clientes', module: 'Cadastros' },
    { code: 'clients.create', label: 'Cadastrar Cliente', category: 'Clientes', module: 'Cadastros' },
    { code: 'clients.edit', label: 'Editar Cliente', category: 'Clientes', module: 'Cadastros' },
    { code: 'clients.delete', label: 'Excluir Cliente', category: 'Clientes', module: 'Cadastros' },

    { code: 'client_users.view', label: 'Visualizar Usuários de Cliente', category: 'Usuários de Cliente', module: 'Cadastros' },
    { code: 'client_users.create', label: 'Criar Usuário de Cliente', category: 'Usuários de Cliente', module: 'Cadastros' },
    { code: 'client_users.edit', label: 'Editar Usuário de Cliente', category: 'Usuários de Cliente', module: 'Cadastros' },
    { code: 'client_users.delete', label: 'Excluir Usuário de Cliente', category: 'Usuários de Cliente', module: 'Cadastros' },

    { code: 'team.view', label: 'Visualizar Usuários do Escritório', category: 'Usuários do Escritório', module: 'Cadastros' },
    { code: 'team.create', label: 'Adicionar Membro', category: 'Usuários do Escritório', module: 'Cadastros' },
    { code: 'team.edit', label: 'Editar Membro', category: 'Usuários do Escritório', module: 'Cadastros' },
    { code: 'team.delete', label: 'Remover Membro', category: 'Usuários do Escritório', module: 'Cadastros' },

    { code: 'departments.view', label: 'Visualizar Departamentos', category: 'Departamentos', module: 'Cadastros' },
    { code: 'departments.create', label: 'Criar Departamento', category: 'Departamentos', module: 'Cadastros' },
    { code: 'departments.edit', label: 'Editar Departamento', category: 'Departamentos', module: 'Cadastros' },
    { code: 'departments.delete', label: 'Excluir Departamento', category: 'Departamentos', module: 'Cadastros' },

    // --- Módulo Pessoal ---
    { code: 'admissions.view', label: 'Visualizar Admissões', category: 'Admissões', module: 'Módulo Pessoal' },
    { code: 'admissions.create', label: 'Criar Admissão', category: 'Admissões', module: 'Módulo Pessoal' },
    { code: 'admissions.edit', label: 'Editar Admissão', category: 'Admissões', module: 'Módulo Pessoal' },
    { code: 'admissions.cancel', label: 'Cancelar Admissão', category: 'Admissões', module: 'Módulo Pessoal' },
    { code: 'admissions.delete', label: 'Excluir Admissão', category: 'Admissões', module: 'Módulo Pessoal' },

    { code: 'transfers.view', label: 'Visualizar Transferências', category: 'Transferências', module: 'Módulo Pessoal' },
    { code: 'transfers.create', label: 'Solicitar Transferência', category: 'Transferências', module: 'Módulo Pessoal' },
    { code: 'transfers.approve', label: 'Concluir Transferência', category: 'Transferências', module: 'Módulo Pessoal' },
    { code: 'transfers.cancel', label: 'Cancelar Transferência', category: 'Transferências', module: 'Módulo Pessoal' },
    { code: 'transfers.rectify', label: 'Retificar Transferência', category: 'Transferências', module: 'Módulo Pessoal' },

    { code: 'vacations.view', label: 'Visualizar Férias', category: 'Férias', module: 'Módulo Pessoal' },
    { code: 'vacations.create', label: 'Solicitar Férias', category: 'Férias', module: 'Módulo Pessoal' },
    { code: 'vacations.approve', label: 'Concluir Férias', category: 'Férias', module: 'Módulo Pessoal' },
    { code: 'vacations.cancel', label: 'Cancelar Férias', category: 'Férias', module: 'Módulo Pessoal' },

    { code: 'dismissals.view', label: 'Visualizar Rescisões', category: 'Rescisões', module: 'Módulo Pessoal' },
    { code: 'dismissals.create', label: 'Solicitar Rescisão', category: 'Rescisões', module: 'Módulo Pessoal' },
    { code: 'dismissals.approve', label: 'Concluir Rescisão', category: 'Rescisões', module: 'Módulo Pessoal' },
    { code: 'dismissals.cancel', label: 'Cancelar Rescisão', category: 'Rescisões', module: 'Módulo Pessoal' },

    { code: 'leaves.view', label: 'Visualizar Afastamentos', category: 'Afastamentos', module: 'Módulo Pessoal' },
    { code: 'leaves.create', label: 'Lançar Afastamento', category: 'Afastamentos', module: 'Módulo Pessoal' },
    { code: 'leaves.edit', label: 'Editar Afastamento', category: 'Afastamentos', module: 'Módulo Pessoal' },
    { code: 'leaves.delete', label: 'Excluir Afastamento', category: 'Afastamentos', module: 'Módulo Pessoal' },

    // --- Módulo Societário ---
    { code: 'societario.view', label: 'Acessar Módulo Societário', category: 'Societário', module: 'Módulo Societário' },
    { code: 'societario.processes.view', label: 'Visualizar Processos', category: 'Societário', module: 'Módulo Societário' },
    { code: 'societario.processes.create', label: 'Criar Processo', category: 'Societário', module: 'Módulo Societário' },
    { code: 'societario.processes.edit', label: 'Editar Processo', category: 'Societário', module: 'Módulo Societário' },
    { code: 'societario.processes.delete', label: 'Excluir Processo', category: 'Societário', module: 'Módulo Societário' },
    
    // --- Módulo Fiscal & Contábil ---
    { code: 'fiscal.view', label: 'Acessar Módulo Fiscal', category: 'Fiscal', module: 'Módulo Fiscal' },
    { code: 'fiscal.simples.view', label: 'Simples Nacional', category: 'Fiscal', module: 'Módulo Fiscal' },
    { code: 'fiscal.faturamento.view', label: 'Faturamento Fiscal', category: 'Fiscal', module: 'Módulo Fiscal' },
    
    { code: 'contabilidade.view', label: 'Acessar Contabilidade', category: 'Contabilidade', module: 'Módulo Fiscal' },
    { code: 'contabilidade.faturamento.view', label: 'Faturamento Contábil', category: 'Contabilidade', module: 'Módulo Fiscal' },

    // --- Módulo Integrações ---
    { code: 'integrations.view', label: 'Acessar Integrações', category: 'Integrações', module: 'Módulo Integrações' },
    { code: 'integrations.enuves', label: 'Acessar Enuves', category: 'Integrações', module: 'Módulo Integrações' },
    { code: 'integrations.eklesia', label: 'Acessar Eklesia', category: 'Integrações', module: 'Módulo Integrações' },
    { code: 'integrations.digisac', label: 'Acessar DigiSac', category: 'Integrações', module: 'Módulo Integrações' },
    { code: 'integrations.questor', label: 'Acessar Questor', category: 'Integrações', module: 'Módulo Integrações' },

    // --- Módulo de Chamados ---
    { code: 'tickets.view', label: 'Visualizar Chamados', category: 'Chamados', module: 'Módulo de Chamados' },
    { code: 'tickets.create', label: 'Abrir Novo Chamado', category: 'Chamados', module: 'Módulo de Chamados' },
    { code: 'tickets.edit', label: 'Editar Chamado', category: 'Chamados', module: 'Módulo de Chamados' },
    { code: 'tickets.comment', label: 'Comentar em Chamado', category: 'Chamados', module: 'Módulo de Chamados' },
    { code: 'tickets.delete', label: 'Excluir Chamado', category: 'Chamados', module: 'Módulo de Chamados' },
    { code: 'tickets.create_category', label: 'Criar Categoria', category: 'Chamados', module: 'Módulo de Chamados' },
    { code: 'tickets.manage_categories', label: 'Gerenciar Categorias', category: 'Chamados', module: 'Módulo de Chamados' },
    { code: 'tickets.admin', label: 'Administrar Chamados', category: 'Chamados', module: 'Módulo de Chamados' },

    // --- ADM (Administração) ---
    { code: 'permissions.view', label: 'Gerenciar Permissões', category: 'Segurança', module: 'ADM' },
    { code: 'audit_logs.view', label: 'Visualizar Logs de Auditoria', category: 'Segurança', module: 'ADM' },

    // --- Gráficos ---
    { code: 'dashboard.view', label: 'Visualizar Dashboard', category: 'Geral', module: 'Gráficos' },

    // --- Configurações ---
    { code: 'settings.view', label: 'Acessar Configurações', category: 'Configurações', module: 'Configurações' },
    { code: 'settings.edit', label: 'Editar Configurações', category: 'Configurações', module: 'Configurações' },
];
