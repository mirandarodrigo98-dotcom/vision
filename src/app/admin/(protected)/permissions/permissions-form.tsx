'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AVAILABLE_PERMISSIONS } from '@/lib/permissions-constants';
import { updateDepartmentPermissions, Department } from '@/app/actions/departments';
import { Loader2, Save } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, useSearchParams } from 'next/navigation';

interface PermissionsFormProps {
    departments: Department[];
    selectedDepartmentId: string;
    initialDepartmentPermissions: string[];
}

export function PermissionsForm({ 
    departments,
    selectedDepartmentId,
    initialDepartmentPermissions
}: PermissionsFormProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [departmentPermissions, setDepartmentPermissions] = useState<string[]>(initialDepartmentPermissions);
    const [isSaving, setIsSaving] = useState(false);

    // Update state when initial props change (e.g., when department changes via navigation)
    useEffect(() => {
        setDepartmentPermissions(initialDepartmentPermissions);
    }, [initialDepartmentPermissions]);

    const modules = Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.module)));

    const handleDepartmentChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('departmentId', value);
        router.push(`/admin/permissions?${params.toString()}`);
    };

    const handlePermissionChange = (permissionCode: string, checked: boolean) => {
        setDepartmentPermissions(prev => 
            checked ? [...prev, permissionCode] : prev.filter(p => p !== permissionCode)
        );
    };

    const handleSave = async () => {
        if (!selectedDepartmentId) {
            toast.error('Selecione um departamento.');
            return;
        }
        setIsSaving(true);
        try {
            const result = await updateDepartmentPermissions(selectedDepartmentId, departmentPermissions);
            if (result.success) {
                toast.success('Permissões do Departamento atualizadas!');
            } else {
                toast.error('Erro ao atualizar permissões.');
            }
        } catch (error) {
            toast.error('Erro ao salvar permissões.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderPermissionsGrid = () => (
        <div className="grid gap-8 mt-6">
            {modules.map(moduleName => {
                const modulePermissions = AVAILABLE_PERMISSIONS.filter(p => p.module === moduleName);
                const categories = Array.from(new Set(modulePermissions.map(p => p.category)));
                
                return (
                    <div key={moduleName} className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                            <h3 className="text-xl font-bold text-foreground">{moduleName}</h3>
                        </div>
                        
                        <div className="grid gap-6">
                            {categories.map(category => (
                                <Card key={category} className="shadow-sm">
                                    <CardHeader className="pb-3 bg-muted/30">
                                        <CardTitle className="text-base font-semibold">{category}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-4">
                                        {modulePermissions.filter(p => p.category === category).map(permission => (
                                            <div key={permission.code} className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-accent/50 transition-colors">
                                                <Switch 
                                                    id={`${selectedDepartmentId}-${permission.code}`} 
                                                    checked={departmentPermissions.includes(permission.code)}
                                                    onCheckedChange={(checked) => handlePermissionChange(permission.code, checked)}
                                                />
                                                <div className="flex-1">
                                                    <Label 
                                                        htmlFor={`${selectedDepartmentId}-${permission.code}`}
                                                        className="text-sm font-medium cursor-pointer block"
                                                    >
                                                        {permission.label}
                                                    </Label>
                                                    {permission.description && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {permission.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    if (!departments || departments.length === 0) {
        return (
            <div className="text-center py-10">
                <h2 className="text-xl font-semibold mb-2">Nenhum departamento encontrado</h2>
                <p className="text-muted-foreground">Crie um departamento no menu Cadastros para gerenciar as permissões.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Permissões por Departamento</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie o acesso dos operadores através dos departamentos. 
                        Administradores possuem acesso total nativo. 
                        Usuários de clientes são gerenciados individualmente.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={isSaving || !selectedDepartmentId}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </div>

            <Tabs value={selectedDepartmentId} onValueChange={handleDepartmentChange} className="w-full">
                <TabsList className="flex flex-wrap h-auto w-full justify-start gap-2 bg-transparent p-0">
                    {departments.map(dept => (
                        <TabsTrigger 
                            key={dept.id} 
                            value={dept.id}
                            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-background"
                        >
                            {dept.name}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value={selectedDepartmentId} className="mt-0">
                    {selectedDepartmentId ? (
                        renderPermissionsGrid()
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            Selecione um departamento para visualizar as permissões.
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}