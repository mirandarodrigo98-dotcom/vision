import { AVAILABLE_PERMISSIONS } from '../src/lib/permissions-constants';

const clientPermissions = AVAILABLE_PERMISSIONS.filter(p => {
    // Exclude Admin module entirely
    if (p.module === 'ADM') return false;
    if (p.module === 'Configurações') return false;
    
    // Exclude Accounting-exclusive modules (as requested)
    if (p.module === 'Módulo Integrações') return false;
    if (p.module === 'Módulo Societário') return false;
    if (p.module === 'Módulo Fiscal') return false; // Covers Fiscal and Contabilidade
    if (p.module === 'Módulo Financeiro') return false; // Exclude internal financial module
    if (p.module === 'Módulo de Chamados') return false; // Exclude Tickets module
    if (p.module === 'Módulo IR') return false; // Exclude Income Tax module

    // Exclude Admin Dashboard permission specifically
    if (p.code === 'dashboard.view') return false;

    // Exclude specific categories in Cadastros that are admin/internal only
    if (p.category === 'Equipe Interna') return false;
    if (p.category === 'Usuários do Escritório') return false;
    if (p.category === 'Departamentos') return false;
    if (p.category === 'Usuários de Cliente') return false; // Client shouldn't manage other users
    if (p.category === 'Segurança') return false;
    if (p.category === 'Clientes') return false; // This is the firm's client list
    if (p.category === 'Sócios') return false; // Exclusive to accounting

    // Stricter rules for Cadastros module
    if (p.module === 'Cadastros') {
        // Block create/delete/edit for Companies (they can only view their own)
        if (p.category === 'Empresas' && (p.code.includes('create') || p.code.includes('delete') || p.code.includes('edit'))) return false;
        
        // Block create/delete for Employees (they should use Admissions or Requests)
        if (p.category === 'Funcionários' && (p.code.includes('create') || p.code.includes('delete'))) return false;
    }

    // Global block for DELETE permissions (Clients generally shouldn't delete records)
    if (p.code.includes('.delete')) return false;

    // Block specific VT admin permissions from client
    if (p.code === 'vt.approve' || p.code === 'vt.cancel') return false;

    return true;
});

console.log("Client permissions:", clientPermissions.map(p => p.category));
console.log("Unique categories:", [...new Set(clientPermissions.map(p => p.category))]);
