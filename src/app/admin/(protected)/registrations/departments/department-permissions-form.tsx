
'use client';

import { useState } from 'react';
import { AVAILABLE_PERMISSIONS, Permission } from '@/lib/permissions-constants';
import { updateDepartmentPermissions } from '@/app/actions/departments';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface DepartmentPermissionsFormProps {
    departmentId: string;
    initialPermissions: string[];
}

export function DepartmentPermissionsForm({ departmentId, initialPermissions }: DepartmentPermissionsFormProps) {
    const [permissions, setPermissions] = useState<string[]>(initialPermissions);
    const [loading, setLoading] = useState(false);

    const modules = Array.from(new Set(AVAILABLE_PERMISSIONS.map(p => p.module)));

    const handleToggle = (code: string, checked: boolean) => {
        setPermissions(prev => 
            checked 
                ? [...prev, code]
                : prev.filter(p => p !== code)
        );
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const result = await updateDepartmentPermissions(departmentId, permissions);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success('Permissões atualizadas com sucesso!');
            }
        } catch (error) {
            toast.error('Erro ao salvar permissões.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAllModule = (moduleName: string, checked: boolean) => {
        const modulePermissions = AVAILABLE_PERMISSIONS.filter(p => p.module === moduleName).map(p => p.code);
        setPermissions(prev => {
            const otherPermissions = prev.filter(p => !modulePermissions.includes(p));
            return checked ? [...otherPermissions, ...modulePermissions] : otherPermissions;
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end sticky top-0 z-10 bg-background py-4 border-b">
                <Button onClick={handleSave} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                </Button>
            </div>

            <div className="grid gap-6">
                {modules.map(moduleName => {
                    const modulePermissions = AVAILABLE_PERMISSIONS.filter(p => p.module === moduleName);
                    const categories = Array.from(new Set(modulePermissions.map(p => p.category)));
                    
                    const allModuleChecked = modulePermissions.every(p => permissions.includes(p.code));

                    return (
                        <Card key={moduleName}>
                            <CardHeader className="pb-3 bg-muted/30 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-lg font-bold">{moduleName}</CardTitle>
                                <div className="flex items-center space-x-2">
                                    <Switch 
                                        checked={allModuleChecked}
                                        onCheckedChange={(checked) => handleToggleAllModule(moduleName, checked)}
                                    />
                                    <Label>Selecionar Tudo</Label>
                                </div>
                            </CardHeader>
                            <CardContent className="grid gap-6 pt-6">
                                {categories.map(category => (
                                    <div key={category} className="space-y-3">
                                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">
                                            {category}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {modulePermissions.filter(p => p.category === category).map(permission => (
                                                <div key={permission.code} className="flex items-center space-x-2 bg-card border p-3 rounded-md hover:bg-accent/50 transition-colors">
                                                    <Switch 
                                                        id={permission.code}
                                                        checked={permissions.includes(permission.code)}
                                                        onCheckedChange={(checked) => handleToggle(permission.code, checked)}
                                                    />
                                                    <Label htmlFor={permission.code} className="cursor-pointer flex-1">
                                                        {permission.label}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
