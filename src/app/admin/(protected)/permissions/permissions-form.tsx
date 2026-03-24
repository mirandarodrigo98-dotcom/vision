'use client';

import { useState, useEffect, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AVAILABLE_PERMISSIONS } from '@/lib/permissions-constants';
import { updateDepartmentPermissions, Department } from '@/app/actions/departments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as Accordion from '@radix-ui/react-accordion';
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
    const permissionsRef = useRef<string[]>(initialDepartmentPermissions);

    // Update state when initial props change (e.g., when department changes via navigation)
    useEffect(() => {
        setDepartmentPermissions(initialDepartmentPermissions);
        permissionsRef.current = initialDepartmentPermissions;
    }, [initialDepartmentPermissions]);

    const modules = Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.module)));

    const handleDepartmentChange = (value: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('departmentId', value);
        router.push(`/admin/permissions?${params.toString()}`);
    };

    const handlePermissionChange = async (permissionCode: string, checked: boolean) => {
        const currentPermissions = permissionsRef.current;
        const newPermissions = checked 
            ? [...currentPermissions, permissionCode]
            : currentPermissions.filter(p => p !== permissionCode);
        
        permissionsRef.current = newPermissions;
        setDepartmentPermissions(newPermissions);

        if (!selectedDepartmentId) {
            toast.error('Selecione um departamento.');
            return;
        }

        try {
            const result = await updateDepartmentPermissions(selectedDepartmentId, newPermissions);
            if (!result.success) {
                permissionsRef.current = currentPermissions;
                setDepartmentPermissions(currentPermissions);
                toast.error('Erro ao salvar permissão.');
            }
        } catch (error) {
            permissionsRef.current = currentPermissions;
            setDepartmentPermissions(currentPermissions);
            toast.error('Erro de conexão ao salvar.');
        }
    };

    const renderPermissionsGrid = () => (
        <Accordion.Root type="multiple" className="grid gap-4 mt-6">
            {modules.map(moduleName => {
                const modulePermissions = AVAILABLE_PERMISSIONS.filter(p => p.module === moduleName);
                const categories = Array.from(new Set(modulePermissions.map(p => p.category)));
                return (
                    <Accordion.Item key={moduleName} value={moduleName} className="border rounded-lg">
                        <Accordion.Header>
                            <Accordion.Trigger className="w-full text-left px-4 py-3 font-semibold hover:bg-muted/50">
                                {moduleName}
                            </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className="px-4 pb-4">
                            <div className="grid gap-4">
                                {categories.map(category => (
                                    <Card key={category} className="shadow-sm">
                                        <CardHeader className="pb-3 bg-muted/30">
                                            <CardTitle className="text-sm font-semibold">{category}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-3">
                                            {modulePermissions.filter(p => p.category === category).map(permission => (
                                                <div key={permission.code} className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-accent/50 transition-colors">
                                                    <Switch 
                                                        id={`${selectedDepartmentId}-${permission.code}`} 
                                                        checked={departmentPermissions.includes(permission.code)}
                                                        onCheckedChange={(checked) => handlePermissionChange(permission.code, checked)}
                                                        className="scale-75"
                                                    />
                                                    <Label 
                                                        htmlFor={`${selectedDepartmentId}-${permission.code}`}
                                                        className="text-xs sm:text-sm font-medium cursor-pointer"
                                                    >
                                                        {permission.label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </Accordion.Content>
                    </Accordion.Item>
                );
            })}
        </Accordion.Root>
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
