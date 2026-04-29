import { AVAILABLE_PERMISSIONS } from '../src/lib/permissions-constants';

const clientPermissions = AVAILABLE_PERMISSIONS.filter(p => {
    if (p.module === 'ADM') return false;
    if (p.module === 'Configurações') return false;
    if (p.module === 'Módulo Integrações') return false;
    if (p.module === 'Módulo Societário') return false;
    if (p.module === 'Módulo Fiscal') return false;
    if (p.module === 'Módulo Financeiro') return false;
    if (p.module === 'Módulo de Chamados') return false;
    if (p.module === 'Módulo IR') return false;
    if (p.code === 'dashboard.view') return false;
    if (p.category === 'Equipe Interna') return false;
    if (p.category === 'Usuários do Escritório') return false;
    if (p.category === 'Departamentos') return false;
    if (p.category === 'Usuários de Cliente') return false;
    if (p.category === 'Segurança') return false;
    if (p.category === 'Clientes') return false;
    if (p.category === 'Sócios') return false;
    if (p.module === 'Cadastros') {
        if (p.category === 'Empresas' && (p.code.includes('create') || p.code.includes('delete') || p.code.includes('edit'))) return false;
        if (p.category === 'Funcionários' && (p.code.includes('create') || p.code.includes('delete'))) return false;
    }
    if (p.code.includes('.delete')) return false;
    if (p.code === 'vt.approve' || p.code === 'vt.cancel') return false;
    return true;
});

const grouped = Object.values(clientPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
}, {} as Record<string, any[]>));

console.log("Groups rendered in UI:");
grouped.forEach(g => {
    console.log(g[0].category, "=>", g.map(p => p.code));
});
