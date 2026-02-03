import { getTeamUsers } from '@/app/actions/team';
import TeamManagementPage from './team-list';

export default async function Page() {
  const users = await getTeamUsers();
  return <TeamManagementPage users={users} />;
}