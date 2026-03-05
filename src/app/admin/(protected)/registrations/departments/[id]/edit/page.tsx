
import { getDepartment, getDepartmentPermissions } from '@/app/actions/departments';
import { DepartmentDetailsForm } from '../../department-details-form';
import { DepartmentPermissionsForm } from '../../department-permissions-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface EditDepartmentPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditDepartmentPage({ params }: EditDepartmentPageProps) {
    const { id } = await params;
    const { data: department, error: deptError } = await getDepartment(id);
    const { data: permissions, error: permError } = await getDepartmentPermissions(id);

    if (deptError || !department) {
        return <div className="p-6 text-red-500">Erro ao carregar departamento: {deptError || 'Não encontrado'}</div>;
    }

    if (permError || !permissions) {
        return <div className="p-6 text-red-500">Erro ao carregar permissões: {permError}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/registrations/departments">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Editar Departamento</h1>
                    <p className="text-muted-foreground">
                        Gerencie as informações e permissões do departamento {department.name}.
                    </p>
                </div>
            </div>

            <Separator />

            <Tabs defaultValue="details" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="details">Dados Cadastrais</TabsTrigger>
                    <TabsTrigger value="permissions">Permissões de Acesso</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-4">
                    <div className="border rounded-lg p-6 bg-card">
                        <DepartmentDetailsForm department={department} />
                    </div>
                </TabsContent>
                <TabsContent value="permissions" className="space-y-4">
                    <div className="border rounded-lg p-6 bg-card">
                        <DepartmentPermissionsForm departmentId={department.id} initialPermissions={permissions} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
