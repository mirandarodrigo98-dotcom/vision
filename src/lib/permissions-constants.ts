export interface Permission {
    code: string;
    label: string;
    description?: string;
    category: string;
}

export const AVAILABLE_PERMISSIONS: Permission[] = [
    // Admissões
    { code: 'admissions.view', label: 'Visualizar Admissões', category: 'Admissões' },
    { code: 'admissions.create', label: 'Criar Admissão', category: 'Admissões' },
    { code: 'admissions.edit', label: 'Retificar Admissão', category: 'Admissões' },
    { code: 'admissions.cancel', label: 'Cancelar Admissão', category: 'Admissões' },
    
    // Transferências
    { code: 'transfers.view', label: 'Visualizar Transferências', category: 'Transferências' },
    { code: 'transfers.create', label: 'Solicitar Transferência', category: 'Transferências' },
    { code: 'transfers.approve', label: 'Concluir Transferência', category: 'Transferências' },
    { code: 'transfers.cancel', label: 'Cancelar Transferência', category: 'Transferências' },
    { code: 'transfers.rectify', label: 'Retificar Transferência', category: 'Transferências' },

    // Férias
    { code: 'vacations.view', label: 'Visualizar Férias', category: 'Férias' },
    { code: 'vacations.create', label: 'Solicitar Férias', category: 'Férias' },
    { code: 'vacations.approve', label: 'Concluir Férias', category: 'Férias' },
    { code: 'vacations.cancel', label: 'Cancelar Férias', category: 'Férias' },

    // Rescisões
    { code: 'dismissals.view', label: 'Visualizar Rescisões', category: 'Rescisões' },
    { code: 'dismissals.create', label: 'Solicitar Rescisão', category: 'Rescisões' },
    { code: 'dismissals.approve', label: 'Concluir Rescisão', category: 'Rescisões' },
    { code: 'dismissals.cancel', label: 'Cancelar Rescisão', category: 'Rescisões' },

    // Funcionários
    { code: 'employees.view', label: 'Visualizar Funcionários', category: 'Funcionários' },
    { code: 'employees.edit', label: 'Editar Funcionários', category: 'Funcionários' },
    
    // Empresas
    { code: 'companies.view', label: 'Visualizar Empresas', category: 'Empresas' },
    
    // Societário
    { code: 'societario.view', label: 'Visualizar módulo Societário', category: 'Societário' },
    { code: 'societario.edit', label: 'Editar dados Societários', category: 'Societário' },
    { code: 'societario.processes.view', label: 'Visualizar Processos', category: 'Societário' },
    { code: 'societario.processes.edit', label: 'Editar Processos', category: 'Societário' },
    
    // Integrações
    { code: 'integrations.view', label: 'Acessar Integrações', category: 'Integrações' },
    { code: 'integrations.enuves', label: 'Acessar Enuves', category: 'Integrações' },
    { code: 'integrations.eklesia', label: 'Acessar Eklesia', category: 'Integrações' },

    // Usuários/Equipe
    { code: 'users.view', label: 'Visualizar Usuários', category: 'Usuários' },
];
