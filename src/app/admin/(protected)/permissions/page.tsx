import { getDepartments, getDepartmentPermissions } from '@/app/actions/departments';
import { PermissionsForm } from './permissions-form';

export default async function PermissionsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const { data: departments } = await getDepartments();
    const resolvedParams = await searchParams;
    let selectedDepartmentId = typeof resolvedParams.departmentId === 'string' ? resolvedParams.departmentId : '';

    // Default to first department if none selected
    if (!selectedDepartmentId && departments && departments.length > 0) {
        selectedDepartmentId = departments[0].id;
    }

    let departmentPermissions: string[] = [];
    if (selectedDepartmentId) {
        const { data } = await getDepartmentPermissions(selectedDepartmentId);
        departmentPermissions = data || [];
    }

    return (
        <PermissionsForm 
            departments={departments || []}
            selectedDepartmentId={selectedDepartmentId}
            initialDepartmentPermissions={departmentPermissions}
        />
    );
}
