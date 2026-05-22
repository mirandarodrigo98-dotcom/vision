import { NextRequest, NextResponse } from 'next/server';

import { getQuestorZenConfig } from '@/app/actions/integrations/questor-zen';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function buildZenApiUrl(baseUrl: string, token: string, path: string) {
  const base = baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}/api/v1/${token}${normalizedPath}`;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Sessao expirada.' }, { status: 401 });
  }

  if (session.role !== 'admin' && session.role !== 'operator') {
    return NextResponse.json({ error: 'Acesso nao autorizado.' }, { status: 403 });
  }

  const fileId = request.nextUrl.searchParams.get('fileId');
  const fileName = request.nextUrl.searchParams.get('name') || 'documento';

  if (!fileId) {
    return NextResponse.json({ error: 'fileId obrigatorio.' }, { status: 400 });
  }

  const config = await getQuestorZenConfig();
  if (!config) {
    return NextResponse.json({ error: 'Configuracao do Questor Zen nao encontrada.' }, { status: 500 });
  }

  const response = await fetch(
    buildZenApiUrl(config.base_url, config.api_token, `/pegararquivo?fileId=${encodeURIComponent(fileId)}`),
    {
      method: 'GET',
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `Falha ao baixar arquivo do Questor Zen: ${errorText}` },
      { status: response.status }
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'application/octet-stream';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName.replace(/[^\w.-]+/g, '_')}"`,
      'Cache-Control': 'no-store',
    },
  });
}
