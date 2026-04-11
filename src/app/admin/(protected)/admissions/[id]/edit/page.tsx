import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { AdmissionForm } from '@/components/admissions/admission-form';

export const dynamic = 'force-dynamic';

export default async function AdminEditAdmissionPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    // Ensure admin or operator
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

    const { id } = await params;

    let admissionQuery = `SELECT * FROM admission_requests WHERE id = $1`;
    const queryParams: any[] = [id];

    if (session.role === 'operator') {
        admissionQuery += ` AND (company_id IS NULL OR company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1))`;
        queryParams.push(session.user_id);
    }

    const admission = (await db.query(admissionQuery, [...queryParams])).rows[0] as any;

    if (!admission) {
        redirect('/admin/admissions');
    }

    let companies = [];
    if (session.role === 'operator') {
        companies = (await db.query(`
            SELECT id, nome, cnpj 
            FROM client_companies 
            WHERE id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1)
            ORDER BY nome
        `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>;
    } else {
        // Admin
        companies = (await db.query(`
            SELECT id, nome, cnpj 
            FROM client_companies 
            ORDER BY nome
          `, [])).rows as Array<{ id: string; nome: string; cnpj: string }>;
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-8">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Editar Admissão</h1>
                <p className="text-muted-foreground">
                    Edite os dados da admissão abaixo.
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
