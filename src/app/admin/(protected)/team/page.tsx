import { getTeamUsers } from '@/app/actions/team';
import { getDepartments } from '@/app/actions/departments';
import { getAccessSchedules } from '@/app/actions/schedules';
import TeamManagementPage from './team-list';

export default async function Page() {
  const [users, departmentsResult, schedules] = await Promise.all([
    getTeamUsers(),
    getDepartments(),
    getAccessSchedules()
  ]);

  const departments = departmentsResult.data || [];

  return <TeamManagementPage users={users} departments={departments} schedules={schedules} />;
}