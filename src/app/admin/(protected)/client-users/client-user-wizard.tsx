'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch'; // My custom switch
import { toast } from 'sonner';
import { Loader2, ArrowRight, ArrowLeft, Check, Search, History } from 'lucide-react';
import { saveClientUser, validateUserEmail, getClientUserPermissions, getClientUserQuestorZenHistory } from '@/app/actions/client-users';
import { AVAILABLE_PERMISSIONS, Permission } from '@/lib/permissions-constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Company {
    id: string;
    nome: string;
    razao_social?: string;
}

interface ClientUserWizardProps {
    isOpen: boolean;
    onClose: () => void;
    companies: Company[];
    initialData?: ClientUserWizardInitialData;
    onSuccess: () => void;
}

interface ClientUserWizardInitialData {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    cell_phone?: string | null;
    notification_email?: number | boolean;
    notification_whatsapp?: number | boolean;
    carne_leao_access?: number | boolean;
    questor_zen_usuario?: string | null;
    questor_zen_senha?: string | null;
    questor_zen_token?: string | null;
    company_ids?: string | null;
}

interface QuestorZenHistoryLog {
    id: string;
    action: string;
    created_at: string;
    metadata: {
        source?: string;
        changes?: Array<{
            field: string;
            label: string;
            oldValue: string;
            newValue: string;
        }>;
    } | string | null;
    user_name?: string | null;
    actor_email?: string | null;
}

type QuestorZenHistoryChange = {
    field: string;
    label: string;
    oldValue: string;
    newValue: string;
};

export function ClientUserWizard({ isOpen, onClose, companies, initialData, onSuccess }: ClientUserWizardProps) {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    
    // Form Data
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
    const [email, setEmail] = useState('');
    const [emailValid, setEmailValid] = useState(false);
    const [userData, setUserData] = useState({
        name: '',
        cell_phone: '',
        notification_email: false,
        notification_whatsapp: false,
        carne_leao_access: false,
        questor_zen_usuario: '',
        questor_zen_senha: '',
        questor_zen_token: '',
    });
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyLogs, setHistoryLogs] = useState<QuestorZenHistoryLog[]>([]);

    // Search for companies
    const [companySearch, setCompanySearch] = useState('');

    // The dialog rehydrates local form state from the selected record whenever it opens.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Pre-fill for edit mode
                setSelectedCompanyIds(initialData.company_ids ? initialData.company_ids.split(',') : []);
                setEmail(initialData.email);
                setEmailValid(true); // Assume valid if editing existing
                setUserData({
                    name: initialData.name,
                    cell_phone: initialData.cell_phone || initialData.phone || '',
                    notification_email: !!initialData.notification_email,
                    notification_whatsapp: !!initialData.notification_whatsapp,
                    carne_leao_access: !!initialData.carne_leao_access,
                    questor_zen_usuario: initialData.questor_zen_usuario || '',
                    questor_zen_senha: initialData.questor_zen_senha || '',
                    questor_zen_token: initialData.questor_zen_token || '',
                });
                
                // Fetch permissions for edit
                getClientUserPermissions(initialData.id).then(perms => {
                    setSelectedPermissions(perms);
                });

                setStep(3); 
            } else {
                // Reset
                setStep(1);
                setSelectedCompanyIds([]);
                setEmail('');
                setEmailValid(false);
                setUserData({
                    name: '',
                    cell_phone: '',
                    notification_email: false,
                    notification_whatsapp: false,
                    carne_leao_access: false,
                    questor_zen_usuario: '',
                    questor_zen_senha: '',
                    questor_zen_token: '',
                });
                setSelectedPermissions([]);
                setHistoryLogs([]);
                setHistoryOpen(false);
            }
        }
    }, [isOpen, initialData]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const formatHistoryDate = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(date);
    };

    const handleOpenHistory = async () => {
        if (!initialData?.id) return;

        setHistoryLoading(true);
        const res = await getClientUserQuestorZenHistory(initialData.id);
        setHistoryLoading(false);

        if (res.error) {
            toast.error(res.error);
            return;
        }

        setHistoryLogs((res.logs || []) as QuestorZenHistoryLog[]);
        setHistoryOpen(true);
    };

    const handleCompanyToggle = (id: string) => {
        setSelectedCompanyIds(prev => 
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleValidateEmail = async () => {
        if (!email) {
            toast.error('Digite um e-mail.');
            return;
        }
        setIsLoading(true);
        const res = await validateUserEmail(email, initialData?.id);
        setIsLoading(false);

        if (res.error) {
            toast.error(res.error);
            setEmailValid(false);
        } else {
            toast.success('E-mail validado!');
            setEmailValid(true);
        }
    };

    const handleNext = () => {
        if (step === 1) {
            if (selectedCompanyIds.length === 0) {
                toast.error('Selecione pelo menos uma empresa.');
                return;
            }
            setStep(initialData ? 3 : 2);
        } else if (step === 2) {
            if (!emailValid) {
                toast.error('Valide o e-mail antes de continuar.');
                return;
            }
            setStep(3);
        }
    };

    const handleSave = async () => {
        if (!userData.name) {
            toast.error('Nome é obrigatório.');
            return;
        }

        setIsLoading(true);
        const payload = {
            id: initialData?.id,
            name: userData.name,
            email: email,
            cell_phone: userData.cell_phone,
            notification_email: userData.notification_email,
            notification_whatsapp: userData.notification_whatsapp,
            carne_leao_access: userData.carne_leao_access,
            questor_zen_usuario: userData.questor_zen_usuario,
            questor_zen_senha: userData.questor_zen_senha,
            questor_zen_token: userData.questor_zen_token,
            company_ids: selectedCompanyIds,
            permissions: selectedPermissions,
        };

        const res = await saveClientUser(payload);
        setIsLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success(initialData ? 'Usuário atualizado!' : 'Usuário criado com sucesso!');
            onSuccess();
            onClose();
        }
    };

    // Filter permissions for client user
    // Exclude ADM and Internal Team modules/categories
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

    // Sort categories to ensure 'Geral' is always at the end, and others are alphabetical
    const groupedPermissions = Object.values(clientPermissions.reduce((acc, perm) => {
        if (!acc[perm.category]) acc[perm.category] = [];
        acc[perm.category].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>)).sort((a, b) => {
        if (a[0].category === 'Geral') return 1;
        if (b[0].category === 'Geral') return -1;
        return a[0].category.localeCompare(b[0].category);
    });

    const filteredCompanies = companies.filter(c => {
        const searchLower = companySearch.toLowerCase();
        const razaoMatch = c.razao_social ? c.razao_social.toLowerCase().includes(searchLower) : false;
        const nomeMatch = c.nome ? c.nome.toLowerCase().includes(searchLower) : false;
        return razaoMatch || nomeMatch;
    }).sort((a, b) => {
        const rA = (a.razao_social || a.nome || '').toUpperCase();
        const rB = (b.razao_social || b.nome || '').toUpperCase();
        return rA.localeCompare(rB);
    });

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {initialData ? 'Editar Usuário do Cliente' : 'Novo Usuário do Cliente'} - Passo {step} de 3
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        {/* Step 1: Companies */}
                        {step === 1 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Selecione as empresas vinculadas</h3>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar empresa por razão social..."
                                        value={companySearch}
                                        onChange={(e) => setCompanySearch(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                                <div className="border rounded-md p-4 max-h-[400px] overflow-y-auto space-y-2">
                                    {filteredCompanies.length === 0 ? (
                                        <p className="text-muted-foreground text-center py-4">Nenhuma empresa encontrada.</p>
                                    ) : (
                                        filteredCompanies.map(company => (
                                            <div key={company.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded">
                                                <Checkbox 
                                                    id={`company-${company.id}`} 
                                                    checked={selectedCompanyIds.includes(company.id)}
                                                    onCheckedChange={() => handleCompanyToggle(company.id)}
                                                />
                                                <div className="grid gap-1.5 leading-none">
                                                    <label
                                                        htmlFor={`company-${company.id}`}
                                                        className="text-sm font-bold uppercase leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                    >
                                                        {company.razao_social || company.nome}
                                                    </label>
                                                    {company.razao_social && company.nome && company.nome !== company.razao_social && (
                                                        <p className="text-xs text-muted-foreground">{company.nome}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {selectedCompanyIds.length} empresa(s) selecionada(s).
                                </p>
                            </div>
                        )}

                        {/* Step 2: Email Validation */}
                        {step === 2 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Validação de E-mail</h3>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-2">
                                        <Label htmlFor="email">E-mail do Usuário</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => {
                                                setEmail(e.target.value);
                                                setEmailValid(false);
                                            }}
                                            placeholder="usuario@email.com"
                                        />
                                    </div>
                                    <Button onClick={handleValidateEmail} disabled={isLoading || !email}>
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validar'}
                                    </Button>
                                </div>
                                {emailValid && (
                                    <div className="flex items-center text-green-600 gap-2 mt-2 bg-green-50 p-2 rounded">
                                        <Check className="h-4 w-4" />
                                        <span className="text-sm">E-mail validado e disponível para uso.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Details & Permissions */}
                        {step === 3 && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome Completo</Label>
                                        <Input
                                            id="name"
                                            value={userData.name}
                                            onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cell_phone">Celular</Label>
                                        <Input
                                            id="cell_phone"
                                            value={userData.cell_phone}
                                            onChange={(e) => setUserData({ ...userData, cell_phone: e.target.value })}
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col space-y-4 border p-4 rounded-md">
                                    <h4 className="font-medium">Notificações</h4>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="notif_email" className="flex flex-col">
                                            <span>Notificações por E-mail</span>
                                            <span className="font-normal text-xs text-muted-foreground">Receber atualizações importantes por e-mail</span>
                                        </Label>
                                        <Switch
                                            id="notif_email"
                                            checked={userData.notification_email}
                                            onCheckedChange={(checked) => setUserData({ ...userData, notification_email: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="notif_whatsapp" className="flex flex-col">
                                            <span>Notificações por Whatsapp</span>
                                            <span className="font-normal text-xs text-muted-foreground">Receber avisos via Whatsapp</span>
                                        </Label>
                                        <Switch
                                            id="notif_whatsapp"
                                            checked={userData.notification_whatsapp}
                                            onCheckedChange={(checked) => setUserData({ ...userData, notification_whatsapp: checked })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between border-t pt-4">
                                        <Label htmlFor="carne_leao" className="flex flex-col">
                                            <span className="font-semibold">Acesso ao Carnê Leão</span>
                                            <span className="font-normal text-xs text-muted-foreground">Habilita o módulo de Pessoa Física / Carnê Leão para este usuário</span>
                                        </Label>
                                        <Switch
                                            id="carne_leao"
                                            checked={userData.carne_leao_access}
                                            onCheckedChange={(checked) => setUserData({ ...userData, carne_leao_access: checked })}
                                        />
                                    </div>
                                    <div className="space-y-4 border-t pt-4">
                                        <div>
                                            <h5 className="font-semibold">Questor Zen</h5>
                                            <p className="text-xs text-muted-foreground">
                                                Dados do usuário do cliente no portal do Questor Zen para autenticação web e integrações futuras.
                                            </p>
                                        </div>
                                        {initialData?.id && (
                                            <div className="flex justify-end">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleOpenHistory}
                                                    disabled={historyLoading}
                                                >
                                                    {historyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <History className="mr-2 h-4 w-4" />}
                                                    Histórico
                                                </Button>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex flex-col space-y-2">
                                                <Label htmlFor="questor_zen_usuario">Usuário</Label>
                                                <Input
                                                    id="questor_zen_usuario"
                                                    value={userData.questor_zen_usuario}
                                                    onChange={(e) => setUserData({ ...userData, questor_zen_usuario: e.target.value })}
                                                    placeholder="E-mail do cliente no Questor Zen"
                                                    autoComplete="off"
                                                />
                                            </div>
                                            <div className="flex flex-col space-y-2">
                                                <Label htmlFor="questor_zen_senha">Senha</Label>
                                                <Input
                                                    id="questor_zen_senha"
                                                    type="password"
                                                    value={userData.questor_zen_senha}
                                                    onChange={(e) => setUserData({ ...userData, questor_zen_senha: e.target.value })}
                                                    placeholder="Senha do cliente no Questor Zen"
                                                    autoComplete="new-password"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col space-y-2">
                                            <Label htmlFor="questor_zen_token" className="flex flex-col">
                                                <span className="font-semibold">Token</span>
                                                <span className="font-normal text-xs text-muted-foreground">
                                                    Token do usuário gerado no Questor Zen.
                                                </span>
                                            </Label>
                                            <Input
                                                id="questor_zen_token"
                                                value={userData.questor_zen_token}
                                                onChange={(e) => setUserData({ ...userData, questor_zen_token: e.target.value })}
                                                placeholder="Cole o token do usuário gerado no Questor Zen"
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Permissões de Acesso</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto border p-4 rounded-md">
                                        {groupedPermissions.map((group) => {
                                            const category = group[0].category;
                                            const allCodes = group.map(p => p.code);
                                            const isAllSelected = allCodes.every(code => selectedPermissions.includes(code));
                                            
                                            return (
                                            <div key={category} className="space-y-2 mb-4">
                                                <div className="flex items-center justify-between border-b pb-1">
                                                    <h4 className="font-semibold text-sm text-muted-foreground">{category}</h4>
                                                    <Switch
                                                        checked={isAllSelected}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedPermissions(prev => Array.from(new Set([...prev, ...allCodes])));
                                                            } else {
                                                                setSelectedPermissions(prev => prev.filter(p => !allCodes.includes(p)));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                {group.map(perm => (
                                                    <div key={perm.code} className="flex items-center justify-between">
                                                        <Label htmlFor={`perm-${perm.code}`} className="text-sm cursor-pointer flex-1">
                                                            {perm.label}
                                                        </Label>
                                                        <Switch
                                                            id={`perm-${perm.code}`}
                                                            checked={selectedPermissions.includes(perm.code)}
                                                            onCheckedChange={(checked) => {
                                                                setSelectedPermissions(prev => 
                                                                    checked ? [...prev, perm.code] : prev.filter(p => p !== perm.code)
                                                                );
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )})}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-between">
                        {step > 1 ? (
                            <Button variant="outline" onClick={() => setStep(initialData && step === 3 ? 1 : step - 1)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                        ) : (
                            <div></div>
                        )}
                        
                        {step < 3 ? (
                            <Button onClick={handleNext}>
                                Próximo <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={handleSave} disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Usuário
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Histórico do Questor Zen</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {historyLogs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma alteração registrada para os campos do Questor Zen.</p>
                        ) : historyLogs.map((log) => {
                            const metadata = typeof log.metadata === 'string'
                                ? JSON.parse(log.metadata)
                                : (log.metadata || {});
                            const changes = Array.isArray(metadata?.changes) ? metadata.changes : [];

                            return (
                                <div key={log.id} className="rounded-md border p-4 space-y-3">
                                    <div className="flex flex-col gap-1 text-sm">
                                        <span className="font-semibold">{log.user_name || log.actor_email || 'Usuário não identificado'}</span>
                                        <span className="text-muted-foreground">{formatHistoryDate(log.created_at)}</span>
                                    </div>

                                    <div className="space-y-2">
                                        {changes.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Sem detalhes adicionais.</p>
                                        ) : changes.map((change: QuestorZenHistoryChange, index: number) => (
                                            <div key={`${log.id}-${index}`} className="text-sm rounded bg-muted/40 p-3">
                                                <div className="font-medium">{change.label}</div>
                                                <div className="text-muted-foreground">De: {change.oldValue}</div>
                                                <div className="text-muted-foreground">Para: {change.newValue}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
