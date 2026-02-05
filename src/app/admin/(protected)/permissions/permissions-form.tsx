'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AVAILABLE_PERMISSIONS } from '@/lib/permissions-constants';
import { updateRolePermissions } from '@/app/actions/permissions';
import { Loader2, Save } from 'lucide-react';

interface PermissionsFormProps {
    initialOperatorPermissions: string[];
    initialClientPermissions: string[];
}

export function PermissionsForm({ initialOperatorPermissions, initialClientPermissions }: PermissionsFormProps) {
    const [operatorPermissions, setOperatorPermissions] = useState<string[]>(initialOperatorPermissions);
    const [clientPermissions, setClientPermissions] = useState<string[]>(initialClientPermissions);
    const [isSaving, setIsSaving] = useState(false);

    const categories = Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.category)));

    const handlePermissionChange = (role: 'operator' | 'client', permissionCode: string, checked: boolean) => {
        if (role === 'operator') {
            setOperatorPermissions(prev => 
                checked ? [...prev, permissionCode] : prev.filter(p => p !== permissionCode)
            );
        } else {
            setClientPermissions(prev => 
                checked ? [...prev, permissionCode] : prev.filter(p => p !== permissionCode)
            );
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const opResult = await updateRolePermissions('operator', operatorPermissions);
            const clResult = await updateRolePermissions('client', clientPermissions);

            if (opResult.success && clResult.success) {
                toast.success('Permissões atualizadas com sucesso!');
            } else {
                toast.error('Erro ao atualizar algumas permissões.');
            }
        } catch (error) {
            toast.error('Erro ao salvar permissões.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderPermissionsList = (role: 'operator' | 'client', currentPermissions: string[]) => (
        <div className="grid gap-6">
            {categories.map(category => (
                <Card key={category}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">{category}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {AVAILABLE_PERMISSIONS.filter(p => p.category === category).map(permission => (
                            <div key={permission.code} className="flex items-start space-x-2">
                                <Checkbox 
                                    id={`${role}-${permission.code}`} 
                                    checked={currentPermissions.includes(permission.code)}
                                    onCheckedChange={(checked) => handlePermissionChange(role, permission.code, checked as boolean)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label 
                                        htmlFor={`${role}-${permission.code}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        {permission.label}
                                    </Label>
                                    {permission.description && (
                                        <p className="text-xs text-muted-foreground">
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
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Permissões de Acesso</h2>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
            </div>

            <Tabs defaultValue="client_user" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="client_user">Clientes</TabsTrigger>
                    <TabsTrigger value="operator">Operadores</TabsTrigger>
                </TabsList>
                <TabsContent value="client_user">
                    {renderPermissionsList('client_user', clientPermissions)}
                </TabsContent>
                <TabsContent value="operator">
                    {renderPermissionsList('operator', operatorPermissions)}
                </TabsContent>
            </Tabs>
        </div>
    );
}
