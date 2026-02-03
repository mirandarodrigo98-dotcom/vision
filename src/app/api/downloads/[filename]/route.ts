import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { filename } = await params;
  
  // Security check: filename shouldn't contain path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new NextResponse('Invalid filename', { status: 400 });
  }

  // Check permissions
  // 1. Is Admin?
  let isAllowed = session.role === 'admin';

  // 2. Is Client Owner?
  if (!isAllowed && session.role === 'client_user') {
      const admission = await db.prepare(`
          SELECT ar.company_id 
          FROM admission_attachments aa
          JOIN admission_requests ar ON aa.admission_id = ar.id
          WHERE aa.storage_path = ?
      `).get(filename) as { company_id: string } | undefined;

      if (admission) {
          const userCompany = await db.prepare(`
              SELECT 1 FROM user_companies WHERE user_id = ? AND company_id = ?
          `).get(session.user_id, admission.company_id);
          
          if (userCompany) {
              isAllowed = true;
          }
      }
  }

  if (!isAllowed) {
      return new NextResponse('Forbidden', { status: 403 });
  }

  const filePath = path.join(process.cwd(), 'uploads', filename);

  if (!fs.existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  
  // Determine content type (simple version)
  const ext = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.zip') contentType = 'application/zip';
  if (ext === '.rar') contentType = 'application/x-rar-compressed';

  return new NextResponse(fileBuffer, {
      headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
      },
  });
}
