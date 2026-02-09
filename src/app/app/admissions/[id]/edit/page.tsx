import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { AdmissionForm } from '@/components/admissions/admission-form';

export default async function EditAdmissionPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'client_user') redirect('/login');

    const { id } = await params;

    const admission = await db.prepare('SELECT * FROM admission_requests WHERE id = ?').get(id) as any;

    if (!admission) {
        redirect('/app/admissions');
    }

    // Access control: User must have access to the company of the admission
    // This is implicitly handled by listing logic, but good to verify here
    const userCompany = await db.prepare('SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, admission.company_id);
    
    // Also allow if it's the active company in session (redundant but safe)
    const hasAccess = userCompany || session.active_company_id === admission.company_id;

    if (!hasAccess) {
        redirect('/app/admissions');
    }

    // Check deadline
    const admissionDate = new Date(admission.admission_date);
    const deadline = new Date(admissionDate);
    deadline.setDate(deadline.getDate() - 1);
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);

    if (now > deadline) {
        return (
             <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-red-600">Prazo Expirado</h1>
                <p className="mt-4">O prazo para retificação desta admissão expirou (até 1 dia antes da data de admissão).</p>
                <a href="/app/admissions" className="mt-6 inline-block text-blue-600 hover:underline">Voltar para a lista</a>
             </div>
        );
    }
    
    if (admission.status === 'CANCELLED') {
         return (
             <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-red-600">Admissão Cancelada</h1>
                <p className="mt-4">Esta admissão foi cancelada e não pode ser editada.</p>
                <a href="/app/admissions" className="mt-6 inline-block text-blue-600 hover:underline">Voltar para a lista</a>
             </div>
        );
    }

    const companies = await db.prepare(`
        SELECT c.id, c.nome, c.cnpj 
        FROM client_companies c 
        JOIN user_companies uc ON c.id = uc.company_id 
        WHERE uc.user_id = ?
        ORDER BY c.nome
      `).all(session.user_id) as Array<{ id: string; nome: string; cnpj: string }>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-8">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Retificar Admissão</h1>
                <p className="text-muted-foreground">
                    Edite os dados da admissão abaixo. O nome do funcionário não pode ser alterado.
                </p>
            </div>
            
            <AdmissionForm companies={companies} initialData={admission} isEditing={true} />
        </div>
    );
}
