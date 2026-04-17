import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { redirect } from 'next/navigation';
import { AdmissionForm } from '@/components/admissions/admission-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminViewAdmissionPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    // Ensure admin or operator
    if (!session || (session.role !== 'admin' && session.role !== 'operator')) redirect('/login');

    const { id } = await params;

    let admissionQuery = `SELECT * FROM admission_requests WHERE id = $1`;
    const queryParams: any[] = [id];

    if (session.role === 'operator') {
        admissionQuery += ` AND (company_id IS NULL OR company_id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $2))`;
        queryParams.push(session.user_id);
    }

    const admission = (await db.query(admissionQuery, [...queryParams])).rows[0] as any;

    if (!admission) {
        redirect('/admin/admissions');
    }

    let companies = [];
    if (session.role === 'operator') {
        companies = (await db.query(`
            SELECT id, COALESCE(razao_social, nome) as nome, cnpj 
            FROM client_companies 
            WHERE id NOT IN (SELECT company_id FROM user_restricted_companies WHERE user_id = $1)
            ORDER BY nome
        `, [session.user_id])).rows as Array<{ id: string; nome: string; cnpj: string }>;
    } else {
        // Admin
        companies = (await db.query(`
            SELECT id, COALESCE(razao_social, nome) as nome, cnpj 
            FROM client_companies 
            ORDER BY nome
          `, [])).rows as Array<{ id: string; nome: string; cnpj: string }>;
    }

    const attachments = (await db.query('SELECT id as attachment_id, original_name FROM admission_attachments WHERE admission_id = $1', [id])).rows;

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
                isAdmin={true} 
                readOnly={true}
            />

            <Card>
                <CardHeader><CardTitle>Anexos da Admissão</CardTitle></CardHeader>
                <CardContent>
                    {attachments.length > 0 ? (
                        <div className="space-y-2">
                            {attachments.map((att: any) => (
                                <a key={att.attachment_id} href={`/api/download/${att.attachment_id}`} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" className="w-full justify-start gap-2 mb-2">
                                        <Download className="h-4 w-4" />
                                        {att.original_name}
                                    </Button>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Nenhum anexo encontrado.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
