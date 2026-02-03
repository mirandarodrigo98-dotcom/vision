import { getRolePermissions } from '@/app/actions/permissions';
import { PermissionsForm } from './permissions-form';

export default async function PermissionsPage() {
    const operatorPermissions = await getRolePermissions('operator');
    const clientPermissions = await getRolePermissions('client');

    return (
        <PermissionsForm 
            initialOperatorPermissions={operatorPermissions}
            initialClientPermissions={clientPermissions}
        />
    );
}
