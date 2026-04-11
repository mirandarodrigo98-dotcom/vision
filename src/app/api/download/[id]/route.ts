import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';
import path from 'path';
import fs from 'fs/promises';

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

  const filePath = path.join(process.cwd(), 'uploads', attachment.storage_path);

  try {
    const fileBuffer = await fs.readFile(filePath);
    
    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Disposition': `attachment; filename="${attachment.original_name}"`,
            'Content-Type': attachment.mime_type,
            'Content-Length': attachment.size_bytes.toString(),
        },
    });
  } catch (error) {
    console.error(error);
    return new NextResponse('Error reading file', { status: 500 });
  }
}
