import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { LeaveForm } from '@/components/leaves/leave-form';
import { getLeave } from '@/app/actions/leaves';

export default async function EditLeavePage({ params }: { params: Promise<{ id: string }> }) {
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

    // Check deadline logic (can only edit if not cancelled, completed, or expired)
    // 1 day before start date
    let stDate: Date;
    if (typeof leave.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(leave.start_date)) {
        const [year, month, day] = leave.start_date.split('-').map(Number);
        stDate = new Date(year, month - 1, day);
    } else {
        stDate = new Date(leave.start_date);
    }
    const deadline = new Date(stDate);
    deadline.setDate(deadline.getDate() - 1);
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    
    const isExpired = now > deadline;
    const isLocked = leave.status === 'CANCELLED' || leave.status === 'COMPLETED';

    if (isLocked || isExpired) {
         // Maybe show read-only view or redirect?
         // Redirecting to view is safer
         redirect(`/app/leaves/${id}/view`);
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
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Retificar Afastamento</h1>
                <p className="text-muted-foreground">
                    Corrija as informações do afastamento.
                </p>
            </div>
            
            <LeaveForm 
                companies={companies} 
                initialData={leave} 
                isEditing={true} 
                redirectPath="/app/leaves"
            />
        </div>
    );
}
