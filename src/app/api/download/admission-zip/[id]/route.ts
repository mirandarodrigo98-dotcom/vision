import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getR2DownloadLink } from '@/lib/r2';
import JSZip from 'jszip';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    try {
        const { rows: attachments } = await db.query(
            'SELECT storage_path, original_name FROM admission_attachments WHERE admission_id = $1',
            [id]
        );

        if (attachments.length === 0) {
            return new NextResponse('Nenhum anexo encontrado', { status: 404 });
        }

        const zip = new JSZip();

        for (const att of attachments) {
            const fileUrl = await getR2DownloadLink(att.storage_path);
            const res = await fetch(fileUrl);
            if (!res.ok) continue;
            const arrayBuffer = await res.arrayBuffer();
            zip.file(att.original_name, arrayBuffer);
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        return new NextResponse(zipBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="Admissao_${id.substring(0, 8)}.zip"`,
            },
        });
    } catch (error) {
        console.error('Error generating zip:', error);
        return new NextResponse('Erro ao gerar arquivo ZIP', { status: 500 });
    }
}