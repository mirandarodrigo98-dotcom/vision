import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { LeaveForm } from '@/components/leaves/leave-form';
import { getLeave } from '@/app/actions/leaves';
import { LeaveActions } from '@/components/leaves/leave-actions';

export default async function ViewLeavePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'client_user') redirect('/login');

    const { id } = await params;
    const leave = await getLeave(id);

    if (!leave) {
        redirect('/app/leaves');
    }

    // Check permissions
    if (session.role === 'client_user') {
         const hasAccess = await db.prepare(`
            SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
        `).get(session.user_id, leave.company_id);

        if (!hasAccess && leave.created_by_user_id !== session.user_id) {
            redirect('/app/leaves');
        }
    }

    const companies = await db.prepare(`
        SELECT cc.id, cc.nome, cc.cnpj 
        FROM client_companies cc
        JOIN user_companies uc ON uc.company_id = cc.id
        WHERE uc.user_id = ?
        ORDER BY cc.nome
      `).all(session.user_id) as Array<{ id: string; nome: string; cnpj: string }>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-8">
            <div className="flex justify-between items-start">
                <div className="flex flex-col space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Visualizar Afastamento</h1>
                    <p className="text-muted-foreground">
                        Detalhes da solicitação de afastamento.
                    </p>
                </div>
                <LeaveActions 
                    leaveId={leave.id} 
                    startDate={leave.start_date} 
                    status={leave.status}
                    employeeName={leave.employee_name}
                />
            </div>
            
            <LeaveForm 
                companies={companies} 
                initialData={leave} 
                isEditing={true} 
                readOnly={true}
                redirectPath="/app/leaves"
            />
        </div>
    );
}
