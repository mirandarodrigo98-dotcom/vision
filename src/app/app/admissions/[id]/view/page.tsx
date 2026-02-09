import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { AdmissionForm } from '@/components/admissions/admission-form';

export default async function ViewAdmissionPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'client_user') redirect('/login');

    const { id } = await params;

    const admission = await db.prepare('SELECT * FROM admission_requests WHERE id = ?').get(id) as any;

    if (!admission) {
        redirect('/app/admissions');
    }

    // Access control: User must have access to the company of the admission
    const userCompany = await db.prepare('SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?').get(session.user_id, admission.company_id);
    const hasAccess = userCompany || session.active_company_id === admission.company_id;

    if (!hasAccess) {
        redirect('/app/admissions');
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
                <h1 className="text-3xl font-bold tracking-tight">Visualizar Admissão</h1>
                <p className="text-muted-foreground">
                    Detalhes da admissão.
                </p>
            </div>
            
            <AdmissionForm 
                companies={companies} 
                initialData={admission} 
                isEditing={true} 
                readOnly={true}
            />
        </div>
    );
}
