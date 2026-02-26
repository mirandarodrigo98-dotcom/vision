import { getAccountants } from '@/app/actions/accountants';
import { AccountantsTable } from '@/components/accountants/AccountantsTable';
import { NewAccountantButton } from '@/components/accountants/NewAccountantButton';

export default async function AccountantsPage() {
  const accountants = await getAccountants();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Contadores</h1>
        <NewAccountantButton />
      </div>

      <div className="rounded-md border bg-card">
        <div className="p-4">
          <AccountantsTable accountants={accountants} />
        </div>
      </div>
    </div>
  );
}
