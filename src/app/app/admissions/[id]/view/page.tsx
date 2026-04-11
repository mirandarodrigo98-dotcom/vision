import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { AdmissionForm } from '@/components/admissions/admission-form';

export default async function ViewAdmissionPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'client_user') redirect('/login');

    const { id } = await params;

    const admission = (await db.query(`SELECT * FROM admission_requests WHERE id = $1`, [id])).rows[0] as any;

    if (!admission) {
        redirect('/app/admissions');
    }

    // Access control: User must have access to the company of the admission
    const userCompany = (await db.query(`SELECT 1 FROM user_companies WHERE user_id = $1 AND company_id = $2`, [session.user_id, admission.company_id])).rows[0];
    const hasAccess = userCompany || session.active_company_id === admission.company_id;

    if (!hasAccess) {
        redirect('/app/admissions');
    }

    const companies = (await db.query(`
        SELECT c.id, c.nome, c.cnpj 
        FROM client_companies c 
        JOIN user_companies uc ON c.id = uc.company_id 
        WHERE uc.user_id = $1
        ORDER BY c.nome
      `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>;

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
