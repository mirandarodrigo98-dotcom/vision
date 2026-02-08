import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { generateEthnicRacialSelfDeclarationPDF } from '@/lib/pdf-generator';

export async function GET(request: NextRequest) {
    const session = await getSession();
    
    if (!session || session.role !== 'client_user') {
        return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const activeCompanyId = session.active_company_id;
    if (!activeCompanyId) {
        return new NextResponse('Selecione uma empresa ativa para gerar o relatório.', { status: 400 });
    }
    
    try {
        const company = await db.prepare('SELECT * FROM client_companies WHERE id = ?').get(activeCompanyId);
        
        if (!company) {
            return new NextResponse('Empresa não encontrada.', { status: 404 });
        }
        
        const pdfBuffer = await generateEthnicRacialSelfDeclarationPDF(company);
        
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="autodeclaracao-etnico-racial.pdf"',
            },
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        return new NextResponse('Erro interno ao gerar o relatório.', { status: 500 });
    }
}
