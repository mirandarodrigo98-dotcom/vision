import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { AdmissionForm } from '@/components/admissions/admission-form';

export default async function AdminEditAdmissionPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    // Ensure admin
    if (!session || session.role !== 'admin') redirect('/login');

    const { id } = await params;

    const admission = await db.prepare('SELECT * FROM admission_requests WHERE id = ?').get(id) as any;

    if (!admission) {
        redirect('/admin/admissions');
    }

    // Fetch all companies for admin
    const companies = await db.prepare(`
        SELECT id, nome, cnpj 
        FROM client_companies 
        ORDER BY nome
      `).all() as Array<{ id: string; nome: string; cnpj: string }>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-8">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Editar Admissão (Admin)</h1>
                <p className="text-muted-foreground">
                    Edite os dados da admissão abaixo. Como administrador, você tem permissão total.
                </p>
            </div>
            
            <AdmissionForm 
                companies={companies} 
                initialData={admission} 
                isEditing={true} 
                isAdmin={true} 
            />
        </div>
    );
}
