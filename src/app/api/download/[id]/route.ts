import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getR2DownloadLink } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id } = await params;

  const attachment = (await db.query(`SELECT * FROM admission_attachments WHERE id = $1`, [id])).rows[0] as any;

  if (!attachment) {
    return new NextResponse('File not found', { status: 404 });
  }

  // Security check: If client, verify ownership
  if (session.role === 'client_user') {
      const admission = (await db.query(`SELECT company_id FROM admission_requests WHERE id = $1`, [attachment.admission_id])).rows[0] as any;
      const userCompany = (await db.query(`SELECT company_id FROM user_companies WHERE user_id = $1`, [session.user_id])).rows[0] as any;
      
      if (!admission || !userCompany || admission.company_id !== userCompany.company_id) {
          return new NextResponse('Forbidden', { status: 403 });
      }
  }

  try {
    const fileUrl = await getR2DownloadLink(attachment.storage_path);
    return NextResponse.redirect(fileUrl);
  } catch (error: any) {
    console.error('Download error:', error);
    return new NextResponse(`Error reading file: ${error.message || String(error)}`, { status: 500 });
  }
}
