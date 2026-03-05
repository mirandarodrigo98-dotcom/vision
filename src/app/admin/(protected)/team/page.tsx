import { getTeamUsers } from '@/app/actions/team';
import { getDepartments } from '@/app/actions/departments';
import TeamManagementPage from './team-list';

export default async function Page() {
  const [users, departmentsResult] = await Promise.all([
    getTeamUsers(),
    getDepartments()
  ]);

  const departments = departmentsResult.data || [];

  return <TeamManagementPage users={users} departments={departments} />;
}